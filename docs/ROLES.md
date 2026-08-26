## 1. Listado y Descripción de Roles del Sistema

| Rol (`roles.nombre`) | Fase | Alta de cuenta | Alcance de datos propio |
|---|---|---|---|
| **dueño** (Dueño de Mascota) | MVP | Autoregistro | Sus propias mascotas, reportes, turnos, autorizaciones de libreta |
| **veterinario** (Veterinario/a) | MVP | Autoregistro + verificación de matrícula por Administrador | Su perfil, su disponibilidad/turnos, entradas de libreta en mascotas que le autorizaron |
| **municipio** (Municipio) | MVP | Alta exclusiva por Administrador (sin autoregistro) | Sus eventos, su vitrina de adopción; lectura/actualización global de reportes |
| **administrador** (Administrador de Plataforma) | MVP | Alta manual / semilla inicial | Acceso global de lectura y funciones de verificación/moderación; sin acceso operativo innecesario a datos clínicos salvo auditoría |
| **organizacion** (Organización / Refugio) — *rol a agregar: `INSERT INTO roles (id, nombre) VALUES (7, 'organizacion');`* | Post-MVP (Módulo 5) | Autoregistro + verificación por Administrador | Sus solicitudes de recurso y las colaboraciones asociadas |
| **rescatista** (Rescatista / Activista) | Post-MVP (Módulo 5) | Autoregistro | Sus colaboraciones ofrecidas, sus métricas propias |
| **comerciante** (Comerciante) | Post-MVP (Módulo 7) | Autoregistro + verificación por Administrador | Su comercio y catálogo de productos |
| **Público (no autenticado / `anon`)** | MVP | N/A — no es fila en `usuarios` | Sin identidad; solo lectura de recursos explícitamente públicos |

---

## 2. Matriz de Permisos (Roles vs. Entidades/Casos de Uso)

**Leyenda:** `C`=Crear · `R`=Leer · `U`=Actualizar · `D`=Baja lógica (soft delete) · `A`=Aprobar/Verificar · `(p)`=alcance propio (ownership) · `(t)`=alcance total/global (rol único por naturaleza institucional o dato comunitario) · `—`=sin acceso.

### Módulo 1 — Autenticación y Registro de Mascotas

| Entidad | dueño | veterinario | municipio | administrador | organizacion* | rescatista* | comerciante* | Público |
|---|---|---|---|---|---|---|---|---|
| roles | R | R | R | R | R | R | R | — |
| usuarios | CRUD(p) | CRUD(p) | RU(p) | CRUD(t) | CRUD(p) | CRUD(p) | CRUD(p) | — |
| perfiles_veterinario | — | CRU(p) | — | RU(t) | — | — | — | — |
| perfiles_municipio | — | — | RU(p) | CRU(t) | — | — | — | — |
| verificaciones | — | CR(p) | CR(p) | RU(t) — Aprueba (A) | CR(p) | — | CR(p) | — |
| mascotas | CRUD(p) | R(p, solo con autorización activa) | — | R(t) | — | — | — | — |

### Módulo 2 — Motor de Reportes Unificado

| Entidad | dueño | veterinario | municipio | administrador | organizacion* | rescatista* | comerciante* | Público |
|---|---|---|---|---|---|---|---|---|
| reportes | CR(p) + R(t) | R(t) | R(t) + U(t, estado) | R(t) + D(t, moderación) | R(t) | R(t) | R(t) | R(t) |
| reportes_historial_estado | R(p, de sus reportes) | — | CR(t) | R(t) | — | — | — | — |
| notificaciones | RU(p) | RU(p) | RU(p) | R(t) | RU(p) | RU(p) | RU(p) | — |

### Módulo 3 — Municipio: Eventos, Turnera y Vitrina de Adopción

| Entidad | dueño | veterinario | municipio | administrador | organizacion* | rescatista* | comerciante* | Público |
|---|---|---|---|---|---|---|---|---|
| eventos | R(t) | R(t) | CRUD(p) | R(t) | R(t) | R(t) | R(t) | R(t) |
| disponibilidad_veterinario | R(t, activa) | CRUD(p) | — | R(t) | — | — | — | — |
| turnos | C(reservar propio) + RU(p) | C(agenda propia) + RU(p) | C(agenda propia) + RU(p) | R(t) | — | — | — | R(t, `estado='disponible'`) |
| vitrina_adopcion | R(t, disponibles) | R(t, disponibles) | CRUD(p) | R(t) | R(t, disponibles) | R(t, disponibles) | R(t, disponibles) | R(t, disponibles) |

### Módulo 4 — Veterinarios: Libreta Sanitaria Básica

| Entidad | dueño | veterinario | administrador |
|---|---|---|---|
| autorizaciones_libreta | CRU(p, de sus mascotas) | R(p, donde figura autorizado) | R(t) |
| entradas_libreta_sanitaria | R(p, de sus mascotas) | CRU(p, solo si autorizado y activo) | R(t) |

### Módulo 5 (Post-MVP) — Red de Colaboración

| Entidad | organizacion | rescatista | veterinario | municipio | administrador |
|---|---|---|---|---|---|
| solicitudes_recurso | CRUD(p) | R(t, abiertas) | R(t, abiertas) | R(t) | R(t) |
| colaboraciones | RU(p, sobre sus solicitudes) | CR(p) | CR(p) | — | R(t) |

### Módulo 6 (Post-MVP) — Veterinarios Avanzado

| Entidad | veterinario | dueño | administrador |
|---|---|---|---|
| productos_veterinario | CRUD(p) | R(t, activos) | R(t) |
| pedidos_producto | RU(p, de sus productos) | CR(p) | R(t) |
| historiales_compartidos | CR(p, como origen o destino) | R(p, de sus mascotas) | R(t) |

### Módulo 7 (Post-MVP) — Marketplace de Comerciantes

| Entidad | comerciante | dueño | administrador | Público |
|---|---|---|---|---|
| comercios | CRUD(p) | R(t, verificados) | RU(t) — Verifica (A) | R(t, verificados) |
| productos_comercio | CRUD(p, de su comercio) | R(t) | R(t) | R(t) |

### Módulo 8 (Post-MVP) — Foros y Cursos

| Entidad | organizacion / municipio | Cualquier autenticado | administrador |
|---|---|---|---|
| cursos | CRUD(p) | R(t) | R(t) |
| inscripciones_curso | R(p, de sus cursos) | CRD(p) | R(t) |
| temas_foro | — | CRUD(p) | UD(t, moderación) |
| respuestas_foro | — | CRUD(p) | UD(t, moderación) |

### Módulo 9 (Post-MVP) — Algoritmo de Compatibilidad de Adopción

| Entidad | dueño (adoptante) | municipio / organizacion | administrador |
|---|---|---|---|
| cuestionarios_adoptante | CRUD(p) | — | R(t) |
| sugerencias_compatibilidad | R(p) | R(p, de sus animales en `vitrina_adopcion`) | R(t) |

*Roles marcados `*` son Post-MVP; sus columnas en Módulos 1–4 documentan qué permisos aplicarán al activarse, sin implicar acceso hoy.*

---

## 3. Reglas y Configuración de Aislamiento de Datos (RLS — PostgreSQL/Supabase)

### 3.1 Funciones auxiliares (`SECURITY DEFINER`, evitan recursión de política)

```sql
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
```

Convención transversal: `ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;` en toda tabla de negocio. Ninguna política de `INSERT`/`UPDATE`/`DELETE` usa `WITH CHECK (true)` ni `USING (true)` — siempre hay una condición real de propiedad o rol, conforme a la restricción del proyecto. `USING (true)` solo se admite en políticas de `SELECT` sobre datos explícitamente públicos.

### 3.2 Patrón A — Recurso 100% propio (sin visibilidad cruzada)
*Aplica a: `mascotas` (base), `perfiles_veterinario`, `perfiles_municipio`, `disponibilidad_veterinario`, `cuestionarios_adoptante`, `productos_veterinario` (escritura), `comercios` (escritura)*

```sql
ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY mascotas_propio ON mascotas FOR ALL
  USING (dueño_id = auth.uid() OR rol_actual() = 'administrador')
  WITH CHECK (dueño_id = auth.uid());
```

### 3.3 Patrón B — Lectura pública + escritura restringida al emisor
*Aplica a: `reportes`, `eventos`, `vitrina_adopcion`, `productos_comercio`, `cursos`, `temas_foro`/`respuestas_foro`*

```sql
ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY reportes_select_publico ON reportes FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY reportes_insert_propio ON reportes FOR INSERT
  WITH CHECK (reportado_por = auth.uid());

-- Solo Municipio o Administrador cambian el estado (el reportante no puede reescribirlo)
CREATE POLICY reportes_update_estado ON reportes FOR UPDATE
  USING (rol_actual() IN ('municipio','administrador'))
  WITH CHECK (rol_actual() IN ('municipio','administrador'));

GRANT SELECT ON reportes TO anon;  -- consulta pública sin login
```

```sql
ALTER TABLE vitrina_adopcion ENABLE ROW LEVEL SECURITY;

CREATE POLICY vitrina_select_publico ON vitrina_adopcion FOR SELECT
  USING (estado = 'disponible' OR municipio_id = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY vitrina_crud_municipio ON vitrina_adopcion FOR ALL
  USING (municipio_id = auth.uid())
  WITH CHECK (municipio_id = auth.uid());

GRANT SELECT ON vitrina_adopcion TO anon;
```

### 3.4 Patrón C — Recurso compartido por autorización explícita del dueño
*Aplica a: `entradas_libreta_sanitaria`, `autorizaciones_libreta`, `historiales_compartidos`*

```sql
ALTER TABLE entradas_libreta_sanitaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY libreta_select ON entradas_libreta_sanitaria FOR SELECT
  USING (
    veterinario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM mascotas m WHERE m.id = mascota_id AND m.dueño_id = auth.uid())
    OR rol_actual() = 'administrador'
  );

CREATE POLICY libreta_insert_autorizado ON entradas_libreta_sanitaria FOR INSERT
  WITH CHECK (veterinario_id = auth.uid() AND autorizado_sobre_mascota(mascota_id));
```

```sql
ALTER TABLE autorizaciones_libreta ENABLE ROW LEVEL SECURITY;

CREATE POLICY autorizacion_crud_dueño ON autorizaciones_libreta FOR ALL
  USING (
    EXISTS (SELECT 1 FROM mascotas m WHERE m.id = mascota_id AND m.dueño_id = auth.uid())
    OR veterinario_id = auth.uid()
  )
  WITH CHECK (EXISTS (SELECT 1 FROM mascotas m WHERE m.id = mascota_id AND m.dueño_id = auth.uid()));
```

### 3.5 Patrón D — Recurso de doble parte con transición de estado (motor de turnera / colaboraciones)
*Aplica a: `turnos`, `colaboraciones`, `pedidos_producto`, `solicitudes_recurso`*

```sql
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY turnos_select ON turnos FOR SELECT
  USING (estado = 'disponible' OR proveedor_id = auth.uid() OR reservado_por = auth.uid()
         OR rol_actual() = 'administrador');

CREATE POLICY turnos_insert_proveedor ON turnos FOR INSERT
  WITH CHECK (proveedor_id = auth.uid());

-- Reserva/cancelación: el propio proveedor gestiona su agenda; cualquier autenticado
-- puede tomar un turno 'disponible' para sí mismo. La prevención de doble-reserva
-- se resuelve a nivel aplicación con `WHERE id=? AND version=? AND estado='disponible'`,
-- no exclusivamente por RLS.
CREATE POLICY turnos_update ON turnos FOR UPDATE
  USING (estado = 'disponible' OR proveedor_id = auth.uid() OR reservado_por = auth.uid())
  WITH CHECK (proveedor_id = auth.uid() OR reservado_por = auth.uid());
```

### 3.6 Patrón E — Verificación y auditoría (Administrador)
*Aplica a: `verificaciones`, campos `estado_verificacion` / `verificado_en` en `usuarios`, `perfiles_veterinario`, `perfiles_municipio`, `comercios`*

```sql
ALTER TABLE verificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY verificaciones_propia ON verificaciones FOR SELECT
  USING (usuario_id = auth.uid() OR rol_actual() = 'administrador');

CREATE POLICY verificaciones_insert_propia ON verificaciones FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY verificaciones_resolver_admin ON verificaciones FOR UPDATE
  USING (rol_actual() = 'administrador')
  WITH CHECK (rol_actual() = 'administrador');
```

### 3.7 Mapa de entidad → patrón aplicado

| Entidad | Patrón |
|---|---|
| usuarios | A (con reglas propias de alta institucional — ver 3.1 extendido para `municipio`) |
| mascotas, perfiles_veterinario, perfiles_municipio, disponibilidad_veterinario, cuestionarios_adoptante | A |
| reportes, eventos, vitrina_adopcion, productos_comercio, productos_veterinario (lectura), cursos, temas_foro, respuestas_foro | B |
| entradas_libreta_sanitaria, autorizaciones_libreta, historiales_compartidos | C |
| turnos, colaboraciones, pedidos_producto, solicitudes_recurso, inscripciones_curso | D |
| verificaciones, comercios (verificación) | E |
| roles, reportes_historial_estado, notificaciones, sugerencias_compatibilidad | Solo lectura filtrada por pertenencia (`usuario_id`/`reporte_id` propio) o `rol_actual() = 'administrador'`; sin escritura directa de usuario final (generadas por la aplicación) |
