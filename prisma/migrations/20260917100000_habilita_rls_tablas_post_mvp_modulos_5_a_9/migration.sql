-- Control de acceso anti-IDOR/BOLA a nivel de base de datos (RLS) para las
-- tablas Post-MVP (Módulos 5 a 9), pendiente desde
-- `20260829180000_habilitar_rls_anti_idor_entidades_con_dueno` (esa
-- migración cubrió deliberadamente solo Módulos 1-4). Transcripción textual
-- de docs/ROLES.md Sección 3 — única fuente de verdad de estas políticas.
-- No modificar acá sin actualizar primero ese documento.
--
-- Hasta esta migración, la única barrera sobre estas tablas era la capa de
-- aplicación (Next.js) — coherente con "Prisma corre con service_role,
-- nunca sujeto a RLS", pero sin esta defensa en profundidad un acceso
-- directo vía Supabase (Realtime, PostgREST, anon/authenticated) quedaba
-- sin ningún control de propiedad o rol.

-- ============================================================
-- Módulo 5 — Red de Colaboración
-- ============================================================

-- solicitudes_recurso: organizacion CRUD(p), rescatista/veterinario R(t,
-- abiertas), municipio/administrador R(t).
ALTER TABLE solicitudes_recurso ENABLE ROW LEVEL SECURITY;

CREATE POLICY solicitudes_recurso_select ON solicitudes_recurso FOR SELECT
  USING (
    estado = 'abierta'
    OR organizacion_id = auth.uid()
    OR rol_actual() IN ('municipio', 'administrador')
  );

CREATE POLICY solicitudes_recurso_insert_propio ON solicitudes_recurso FOR INSERT
  WITH CHECK (organizacion_id = auth.uid());

CREATE POLICY solicitudes_recurso_update_propio ON solicitudes_recurso FOR UPDATE
  USING (organizacion_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (organizacion_id = auth.uid());

CREATE POLICY solicitudes_recurso_delete_propio ON solicitudes_recurso FOR DELETE
  USING (organizacion_id = auth.uid() OR rol_actual() = 'administrador');

-- colaboraciones: organizacion RU(p, sobre sus solicitudes), rescatista/
-- veterinario CR(p) como stakeholder, administrador R(t).
ALTER TABLE colaboraciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY colaboraciones_select ON colaboraciones FOR SELECT
  USING (
    stakeholder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM solicitudes_recurso sr WHERE sr.id = solicitud_id AND sr.organizacion_id = auth.uid())
    OR rol_actual() = 'administrador'
  );

CREATE POLICY colaboraciones_insert_propio ON colaboraciones FOR INSERT
  WITH CHECK (stakeholder_id = auth.uid());

-- Solo la organización dueña de la solicitud transiciona el estado de la
-- colaboración (aceptar/rechazar/completar) — docs/ROLES.md: "RU(p, sobre
-- sus solicitudes)", mismo criterio que ActualizarEstadoColaboracionCommand
-- a nivel de aplicación.
CREATE POLICY colaboraciones_update_organizacion ON colaboraciones FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM solicitudes_recurso sr WHERE sr.id = solicitud_id AND sr.organizacion_id = auth.uid())
    OR rol_actual() = 'administrador'
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM solicitudes_recurso sr WHERE sr.id = solicitud_id AND sr.organizacion_id = auth.uid())
  );

-- colaboraciones_historial_estado: solo lectura, generada por la aplicación
-- (INSERT-only desde ActualizarEstadoColaboracionCommand, nunca directo del
-- usuario final) — pertenencia transitiva vía stakeholder_id propio o
-- solicitud_id → solicitudes_recurso.organizacion_id (docs/ROLES.md 3.7).
ALTER TABLE colaboraciones_historial_estado ENABLE ROW LEVEL SECURITY;

CREATE POLICY colaboraciones_historial_select ON colaboraciones_historial_estado FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM colaboraciones c WHERE c.id = colaboracion_id AND c.stakeholder_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM colaboraciones c
      JOIN solicitudes_recurso sr ON sr.id = c.solicitud_id
      WHERE c.id = colaboracion_id AND sr.organizacion_id = auth.uid()
    )
    OR rol_actual() = 'administrador'
  );

CREATE POLICY colaboraciones_historial_insert_sistema ON colaboraciones_historial_estado FOR INSERT
  WITH CHECK (rol_actual() = 'administrador');

-- ============================================================
-- Módulo 6 — Veterinarios Avanzado
-- ============================================================

-- productos_veterinario: veterinario CRUD(p), dueño R(t, activos).
ALTER TABLE productos_veterinario ENABLE ROW LEVEL SECURITY;

CREATE POLICY productos_veterinario_select_publico ON productos_veterinario FOR SELECT
  USING (deleted_at IS NULL OR veterinario_id = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY productos_veterinario_crud_propio ON productos_veterinario FOR ALL
  USING (veterinario_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (veterinario_id = auth.uid());

-- pedidos_producto: dueño CR(p), veterinario RU(p, de sus productos) —
-- confirmar/cancelar exclusivo del veterinario dueño del producto pedido,
-- mismo criterio que ActualizarEstadoPedido.persistir() a nivel de
-- aplicación (PEA-VETADV-004).
ALTER TABLE pedidos_producto ENABLE ROW LEVEL SECURITY;

CREATE POLICY pedidos_producto_select ON pedidos_producto FOR SELECT
  USING (
    comprador_id = auth.uid()
    OR EXISTS (SELECT 1 FROM productos_veterinario pv WHERE pv.id = producto_id AND pv.veterinario_id = auth.uid())
    OR rol_actual() = 'administrador'
  );

CREATE POLICY pedidos_producto_insert_propio ON pedidos_producto FOR INSERT
  WITH CHECK (comprador_id = auth.uid());

CREATE POLICY pedidos_producto_update_veterinario ON pedidos_producto FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM productos_veterinario pv WHERE pv.id = producto_id AND pv.veterinario_id = auth.uid())
    OR rol_actual() = 'administrador'
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM productos_veterinario pv WHERE pv.id = producto_id AND pv.veterinario_id = auth.uid())
  );

-- historiales_compartidos: veterinario CR(p, como origen o destino), dueño
-- R(p, de sus mascotas). Revocar (UPDATE de revocado_en) exclusivo del
-- veterinario origen, AC explícito de RevocarHistorialCompartido.
ALTER TABLE historiales_compartidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY historiales_compartidos_select ON historiales_compartidos FOR SELECT
  USING (
    veterinario_origen_id = auth.uid()
    OR veterinario_destino_id = auth.uid()
    OR EXISTS (SELECT 1 FROM mascotas m WHERE m.id = mascota_id AND m.dueño_id = auth.uid())
    OR rol_actual() = 'administrador'
  );

CREATE POLICY historiales_compartidos_insert_origen ON historiales_compartidos FOR INSERT
  WITH CHECK (veterinario_origen_id = auth.uid());

CREATE POLICY historiales_compartidos_update_origen ON historiales_compartidos FOR UPDATE
  USING (veterinario_origen_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (veterinario_origen_id = auth.uid());

-- ============================================================
-- Módulo 7 — Marketplace de Comerciantes
-- ============================================================

-- productos_comercio: comerciante CRUD(p, de su comercio), lectura pública
-- (dueño/anon) — mismo criterio ya aplicado a comercios en
-- 20260914150000_habilita_rls_lectura_publica_comercios.
ALTER TABLE productos_comercio ENABLE ROW LEVEL SECURITY;

CREATE POLICY productos_comercio_select_publico ON productos_comercio FOR SELECT
  USING (
    deleted_at IS NULL
    OR EXISTS (SELECT 1 FROM comercios c WHERE c.id = comercio_id AND c.usuario_id = auth.uid())
    OR rol_actual() = 'administrador'
  );

CREATE POLICY productos_comercio_crud_propio ON productos_comercio FOR ALL
  USING (
    EXISTS (SELECT 1 FROM comercios c WHERE c.id = comercio_id AND c.usuario_id = auth.uid())
    OR rol_actual() = 'administrador'
  )
  WITH CHECK (EXISTS (SELECT 1 FROM comercios c WHERE c.id = comercio_id AND c.usuario_id = auth.uid()));

GRANT SELECT ON productos_comercio TO anon;

-- ============================================================
-- Módulo 8 — Foros y Cursos
-- ============================================================

-- cursos: organizacion/municipio CRUD(p), cualquier autenticado R(t).
ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY cursos_select ON cursos FOR SELECT
  USING (deleted_at IS NULL OR publicado_por = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY cursos_crud_propio ON cursos FOR ALL
  USING (publicado_por = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (publicado_por = auth.uid() AND rol_actual() IN ('organizacion', 'municipio'));

-- inscripciones_curso: organizacion/municipio R(p, de sus cursos), cualquier
-- autenticado CRD(p). Sin deleted_at (DELETE físico, docs/DECISIONES.md).
ALTER TABLE inscripciones_curso ENABLE ROW LEVEL SECURITY;

CREATE POLICY inscripciones_curso_select ON inscripciones_curso FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM cursos c WHERE c.id = curso_id AND c.publicado_por = auth.uid())
    OR rol_actual() = 'administrador'
  );

CREATE POLICY inscripciones_curso_insert_propio ON inscripciones_curso FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY inscripciones_curso_delete_propio ON inscripciones_curso FOR DELETE
  USING (usuario_id = auth.uid() OR rol_actual() = 'administrador');

-- temas_foro: cualquier autenticado CRUD(p), administrador UD(t, moderación).
ALTER TABLE temas_foro ENABLE ROW LEVEL SECURITY;

CREATE POLICY temas_foro_select ON temas_foro FOR SELECT
  USING (deleted_at IS NULL OR creado_por = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY temas_foro_insert_propio ON temas_foro FOR INSERT
  WITH CHECK (creado_por = auth.uid());

CREATE POLICY temas_foro_update ON temas_foro FOR UPDATE
  USING (creado_por = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (creado_por = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY temas_foro_delete ON temas_foro FOR DELETE
  USING (creado_por = auth.uid() OR rol_actual() = 'administrador');

-- respuestas_foro: mismo patrón que temas_foro.
ALTER TABLE respuestas_foro ENABLE ROW LEVEL SECURITY;

CREATE POLICY respuestas_foro_select ON respuestas_foro FOR SELECT
  USING (deleted_at IS NULL OR usuario_id = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY respuestas_foro_insert_propio ON respuestas_foro FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY respuestas_foro_update ON respuestas_foro FOR UPDATE
  USING (usuario_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (usuario_id = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY respuestas_foro_delete ON respuestas_foro FOR DELETE
  USING (usuario_id = auth.uid() OR rol_actual() = 'administrador');

-- ============================================================
-- Módulo 9 — Algoritmo de Compatibilidad de Adopción
-- ============================================================

-- cuestionarios_adoptante: dueño CRUD(p) — Patrón A.
ALTER TABLE cuestionarios_adoptante ENABLE ROW LEVEL SECURITY;

CREATE POLICY cuestionarios_adoptante_propio ON cuestionarios_adoptante FOR ALL
  USING (usuario_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (usuario_id = auth.uid());

-- sugerencias_compatibilidad: solo lectura, generada por la aplicación
-- (GenerarSugerenciasCompatibilidad, nunca INSERT directo del usuario
-- final). Pertenencia del dueño vía cuestionario propio; de
-- municipio/organizacion vía sus propios animales en vitrina_adopcion.
ALTER TABLE sugerencias_compatibilidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY sugerencias_compatibilidad_select ON sugerencias_compatibilidad FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM cuestionarios_adoptante ca WHERE ca.id = cuestionario_id AND ca.usuario_id = auth.uid())
    OR EXISTS (SELECT 1 FROM vitrina_adopcion va WHERE va.id = vitrina_adopcion_id AND va.municipio_id = auth.uid())
    OR rol_actual() = 'administrador'
  );

CREATE POLICY sugerencias_compatibilidad_insert_sistema ON sugerencias_compatibilidad FOR INSERT
  WITH CHECK (rol_actual() = 'administrador');
