-- Control de acceso anti-IDOR/BOLA a nivel de base de datos (RLS).
-- Transcripción textual de docs/ROLES.md, Sección 3 — única fuente de verdad
-- de estas políticas. No modificar acá sin actualizar primero ese documento.
--
-- Alcance de esta migración: las tablas de los Módulos 1 a 4 (MVP) para las
-- que docs/ROLES.md ya define una política completa, incluyendo las cuatro
-- entidades con dueño auditadas explícitamente por esta actividad (mascotas,
-- reportes, turnos, entradas_libreta_sanitaria). Las tablas Post-MVP
-- (Módulos 5 a 9) reciben su propia migración de RLS cuando se implemente
-- cada módulo, siguiendo el mismo patrón documentado acá.
--
-- Convención transversal (docs/ROLES.md 3.1): ninguna política de
-- INSERT/UPDATE/DELETE usa USING(true) ni WITH CHECK(true) — siempre hay una
-- condición real de propiedad o rol. USING(true) solo se admite en SELECT
-- sobre datos explícitamente públicos (reportes, vitrina_adopcion).

-- ============================================================
-- Shim de compatibilidad — SOLO para Postgres vanilla (Docker local, CI):
-- en Supabase real el schema `auth` (con `auth.uid()`) y el rol `anon` ya
-- existen, provistos por el proveedor; este bloque nunca debe tocarlos y
-- por eso cada pieza se crea solo si todavía no existe. Sin este shim,
-- `CREATE POLICY`/`CREATE FUNCTION`/`GRANT ... TO anon` más abajo fallan al
-- no poder resolver `auth.uid()` ni el rol `anon` contra un Postgres sin
-- Supabase (ver docker-compose.yml: "pgvector/pgvector:pg15 ... sin
-- depender de Supabase cloud", el mismo motor que usa la base de test en CI).
-- `auth.uid()` devuelve NULL por default; un test que necesite simular un
-- usuario autenticado puede fijarlo con `SET LOCAL request.jwt.claim.sub =
-- '<uuid>'`.
-- ============================================================

DO $shim$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS UUID AS $body$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID
    $body$ LANGUAGE sql STABLE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END
$shim$;

-- ============================================================
-- 3.1 — Funciones auxiliares (SECURITY DEFINER, evitan recursión de política)
-- ============================================================

CREATE OR REPLACE FUNCTION rol_actual() RETURNS TEXT AS $$
  SELECT r.nombre FROM usuarios u JOIN roles r ON r.id = u.rol_id
  WHERE u.id = auth.uid() AND u.deleted_at IS NULL
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION veterinario_verificado() RETURNS BOOLEAN AS $$
  SELECT estado_verificacion = 'verificado' FROM usuarios WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION autorizado_sobre_mascota(p_mascota_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM autorizaciones_libreta
    WHERE mascota_id = p_mascota_id AND veterinario_id = auth.uid() AND revocada_en IS NULL
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 3.2 — Patrón A: recurso 100% propio (sin visibilidad cruzada)
-- Entidad auditada por esta actividad: mascotas.
-- ============================================================

ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY mascotas_propio ON mascotas FOR ALL
  USING (dueño_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (dueño_id = auth.uid());

-- Mismo patrón A, dueño = clave primaria de la tabla (usuario_id).

ALTER TABLE perfiles_veterinario ENABLE ROW LEVEL SECURITY;

CREATE POLICY perfiles_veterinario_propio ON perfiles_veterinario FOR ALL
  USING (usuario_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (usuario_id = auth.uid());

ALTER TABLE perfiles_municipio ENABLE ROW LEVEL SECURITY;

CREATE POLICY perfiles_municipio_propio ON perfiles_municipio FOR ALL
  USING (usuario_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (usuario_id = auth.uid());

ALTER TABLE disponibilidad_veterinario ENABLE ROW LEVEL SECURITY;

CREATE POLICY disponibilidad_veterinario_propio ON disponibilidad_veterinario FOR ALL
  USING (veterinario_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (veterinario_id = auth.uid());

-- ============================================================
-- 3.3 — Patrón B: lectura pública + escritura restringida al emisor
-- Entidad auditada por esta actividad: reportes.
-- ============================================================

ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY reportes_select_publico ON reportes FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY reportes_insert_propio ON reportes FOR INSERT
  WITH CHECK (reportado_por = auth.uid());

-- Solo Municipio o Administrador cambian el estado (el reportante no puede reescribirlo)
CREATE POLICY reportes_update_estado ON reportes FOR UPDATE
  USING (rol_actual() IN ('municipio', 'administrador'))
  WITH CHECK (rol_actual() IN ('municipio', 'administrador'));

GRANT SELECT ON reportes TO anon; -- consulta pública sin login

ALTER TABLE reportes_historial_estado ENABLE ROW LEVEL SECURITY;

CREATE POLICY reportes_historial_select ON reportes_historial_estado FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM reportes r WHERE r.id = reporte_id AND r.reportado_por = auth.uid())
    OR rol_actual() IN ('municipio', 'administrador')
  );

CREATE POLICY reportes_historial_insert ON reportes_historial_estado FOR INSERT
  WITH CHECK (rol_actual() IN ('municipio', 'administrador'));

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY eventos_select_publico ON eventos FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY eventos_crud_municipio ON eventos FOR ALL
  USING (municipio_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (municipio_id = auth.uid());

GRANT SELECT ON eventos TO anon;

ALTER TABLE vitrina_adopcion ENABLE ROW LEVEL SECURITY;

CREATE POLICY vitrina_select_publico ON vitrina_adopcion FOR SELECT
  USING (estado = 'disponible' OR municipio_id = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY vitrina_crud_municipio ON vitrina_adopcion FOR ALL
  USING (municipio_id = auth.uid())
  WITH CHECK (municipio_id = auth.uid());

GRANT SELECT ON vitrina_adopcion TO anon;

-- ============================================================
-- 3.4 — Patrón C: recurso compartido por autorización explícita del dueño
-- Entidad auditada por esta actividad: entradas_libreta_sanitaria.
-- ============================================================

ALTER TABLE entradas_libreta_sanitaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY libreta_select ON entradas_libreta_sanitaria FOR SELECT
  USING (
    veterinario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM mascotas m WHERE m.id = mascota_id AND m.dueño_id = auth.uid())
    OR rol_actual() = 'administrador'
  );

CREATE POLICY libreta_insert_autorizado ON entradas_libreta_sanitaria FOR INSERT
  WITH CHECK (veterinario_id = auth.uid() AND autorizado_sobre_mascota(mascota_id));

ALTER TABLE autorizaciones_libreta ENABLE ROW LEVEL SECURITY;

CREATE POLICY autorizacion_crud_dueño ON autorizaciones_libreta FOR ALL
  USING (
    EXISTS (SELECT 1 FROM mascotas m WHERE m.id = mascota_id AND m.dueño_id = auth.uid())
    OR veterinario_id = auth.uid()
  )
  WITH CHECK (EXISTS (SELECT 1 FROM mascotas m WHERE m.id = mascota_id AND m.dueño_id = auth.uid()));

-- ============================================================
-- 3.5 — Patrón D: recurso de doble parte con transición de estado
-- Entidad auditada por esta actividad: turnos.
-- ============================================================

ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY turnos_select ON turnos FOR SELECT
  USING (estado = 'disponible' OR proveedor_id = auth.uid() OR reservado_por = auth.uid()
         OR rol_actual() = 'administrador');

CREATE POLICY turnos_insert_proveedor ON turnos FOR INSERT
  WITH CHECK (proveedor_id = auth.uid());

-- Reserva/cancelación: el propio proveedor gestiona su agenda; cualquier autenticado
-- puede tomar un turno 'disponible' para sí mismo. La prevención de doble-reserva
-- se resuelve a nivel aplicación con WHERE id=? AND version=? AND estado='disponible',
-- no exclusivamente por RLS.
CREATE POLICY turnos_update ON turnos FOR UPDATE
  USING (estado = 'disponible' OR proveedor_id = auth.uid() OR reservado_por = auth.uid())
  WITH CHECK (proveedor_id = auth.uid() OR reservado_por = auth.uid());

-- ============================================================
-- 3.6 — Patrón E: verificación y auditoría (Administrador)
-- ============================================================

ALTER TABLE verificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY verificaciones_propia ON verificaciones FOR SELECT
  USING (usuario_id = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY verificaciones_insert_propia ON verificaciones FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY verificaciones_resolver_admin ON verificaciones FOR UPDATE
  USING (rol_actual() = 'administrador')
  WITH CHECK (rol_actual() = 'administrador');

-- ============================================================
-- Solo lectura filtrada por pertenencia (docs/ROLES.md, mapa de 3.7)
-- ============================================================

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY notificaciones_propia ON notificaciones FOR SELECT
  USING (usuario_id = auth.uid() OR rol_actual() = 'administrador');

-- Las notificaciones las genera la aplicación (service_role), nunca el usuario final.
CREATE POLICY notificaciones_insert_sistema ON notificaciones FOR INSERT
  WITH CHECK (rol_actual() = 'administrador');
