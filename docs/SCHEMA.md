# Esquema de Base de Datos — Patitas en Alerta
**Motor:** PostgreSQL 15+ (Supabase) · **Paradigma:** monolito relacional, single-tenant · **ORM:** Prisma

## Convenciones

- PK: `UUID DEFAULT gen_random_uuid()` en todas las tablas transaccionales.
- Timestamps: `TIMESTAMPTZ`. Toda tabla de negocio incluye `created_at`, `updated_at`, `deleted_at` (soft delete; `deleted_at IS NULL` = registro activo).
- Campos categóricos (estados, tipos): `TEXT + CHECK` en vez de `ENUM` nativo de Postgres, para poder sumar valores nuevos con una migración aditiva simple en vez de `ALTER TYPE`.
- Roles de usuario: tabla de referencia `roles` (no `ENUM`), para poder sumar roles Post-MVP (`rescatista`, `comerciante`) sin migración destructiva.
- Nomenclatura: `snake_case`, español latinoamericano, según especificación técnica del proyecto.

## Extensiones requeridas

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;    -- pgvector, búsqueda semántica
```

---

# 1.A — Esquema MVP

## Módulo 1: Autenticación y Registro de Mascotas

```sql
CREATE TABLE roles (
  id SMALLINT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Semilla: 1=dueño, 2=veterinario, 3=municipio, 4=administrador
-- Reservados para Post-MVP (sin migración destructiva al activarse): 5=rescatista, 6=comerciante
INSERT INTO roles (id, nombre) VALUES
  (1,'dueño'), (2,'veterinario'), (3,'municipio'), (4,'administrador'),
  (5,'rescatista'), (6,'comerciante');

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  rol_id SMALLINT NOT NULL REFERENCES roles(id),
  estado_verificacion TEXT NOT NULL DEFAULT 'no_requerido'
    CHECK (estado_verificacion IN ('no_requerido','pendiente','verificado','rechazado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX ux_usuarios_email ON usuarios (email) WHERE deleted_at IS NULL;
CREATE INDEX ix_usuarios_rol ON usuarios (rol_id) WHERE deleted_at IS NULL;

-- AUTH-verificación: BadgeVerificacion (src/presentacion/componentes/auth)
-- se suscribe a esta tabla vía Supabase Realtime (Postgres Changes) para
-- reflejar sin recargar cuando un Administrador aprueba/rechaza una
-- verificación. Requiere habilitar la réplica lógica de esta tabla:
ALTER PUBLICATION supabase_realtime ADD TABLE usuarios;

CREATE TABLE perfiles_veterinario (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios(id),
  matricula TEXT NOT NULL,
  colegio_emisor TEXT NOT NULL,
  verificado_en TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX ux_perfiles_veterinario_matricula ON perfiles_veterinario (matricula, colegio_emisor);

CREATE TABLE perfiles_municipio (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios(id),
  nombre_institucional TEXT NOT NULL,
  verificado_en TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE verificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('veterinario','municipio')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  motivo_rechazo TEXT NULL,
  revisado_por UUID NULL REFERENCES usuarios(id),
  resuelto_en TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_verificaciones_estado ON verificaciones (estado);
CREATE INDEX ix_verificaciones_usuario ON verificaciones (usuario_id);

CREATE TABLE mascotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dueño_id UUID NOT NULL REFERENCES usuarios(id),
  nombre TEXT NOT NULL,
  especie TEXT NOT NULL,
  raza TEXT NULL,
  edad_aproximada SMALLINT NULL CHECK (edad_aproximada >= 0),
  foto_url TEXT NOT NULL,
  identificacion_chip TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_mascotas_dueño ON mascotas (dueño_id) WHERE deleted_at IS NULL;
```

## Módulo 2: Motor de Reportes Unificado

```sql
CREATE TABLE reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('perdido','encontrado','problematica')),
  -- Solo obligatorio (y solo válido) para tipo='problematica' — REP-03.
  -- Para 'perdido'/'encontrado' CrearReporte.ts fuerza subtipo=NULL.
  subtipo TEXT NULL
    CHECK (subtipo IS NULL OR subtipo IN ('animal_suelto','foco_sanitario','accidente_vial'))
    CHECK (tipo <> 'problematica' OR subtipo IS NOT NULL),
  reportado_por UUID NOT NULL REFERENCES usuarios(id),
  -- 'problematica' nunca está vinculada a una mascota registrada.
  mascota_id UUID NULL REFERENCES mascotas(id)
    CHECK (tipo <> 'problematica' OR mascota_id IS NULL),
  descripcion TEXT NOT NULL,
  descripcion_embedding VECTOR(1536) NULL, -- poblado desde el MVP; consumido recién en Módulo 5/9
  foto_url TEXT NOT NULL,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  -- Especie del animal (texto libre, mismo criterio que mascotas.especie).
  -- Nullable: mascota_id es opcional, así que no todo reporte tiene de dónde
  -- derivarla. Sostiene la coincidencia zona+especie entre 'perdido' y
  -- 'encontrado' (REP-U-06) — ver EvaluarCoincidenciaReporte.ts.
  especie TEXT NULL,
  estado TEXT NOT NULL DEFAULT 'reportado'
    CHECK (estado IN ('reportado','en_revision','en_atencion','resuelto','cerrado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_reportes_tipo_estado_especie ON reportes (tipo, estado, especie) WHERE deleted_at IS NULL;
CREATE INDEX ix_reportes_geo ON reportes (latitud, longitud);
CREATE INDEX ix_reportes_reportado_por ON reportes (reportado_por);
CREATE INDEX ix_reportes_embedding_hnsw ON reportes USING hnsw (descripcion_embedding vector_cosine_ops);

CREATE TABLE reportes_historial_estado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id UUID NOT NULL REFERENCES reportes(id),
  estado_anterior TEXT NOT NULL,
  estado_nuevo TEXT NOT NULL,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_historial_reporte ON reportes_historial_estado (reporte_id);

CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN
    ('reporte_coincidente','turno_confirmado','turno_cancelado','verificacion_resuelta')),
  referencia_tabla TEXT NOT NULL,
  referencia_id UUID NOT NULL,
  leido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notificaciones_usuario_leido ON notificaciones (usuario_id, leido);
```

## Módulo 3: Municipio — Eventos, Turnera y Vitrina de Adopción

```sql
CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipio_id UUID NOT NULL REFERENCES usuarios(id),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('castracion','vacunacion','desparasitacion','otro')),
  direccion TEXT NOT NULL,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  fecha TIMESTAMPTZ NOT NULL,
  cupos_totales INTEGER NOT NULL CHECK (cupos_totales > 0),
  requisitos TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_eventos_municipio_fecha ON eventos (municipio_id, fecha);

CREATE TABLE disponibilidad_veterinario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veterinario_id UUID NOT NULL REFERENCES usuarios(id),
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL CHECK (hora_fin > hora_inicio),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_disponibilidad_vet ON disponibilidad_veterinario (veterinario_id, dia_semana);

-- Motor de Turnera compartido: mismo modelo para proveedor_tipo = municipio | veterinario
CREATE TABLE turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_tipo TEXT NOT NULL CHECK (proveedor_tipo IN ('municipio','veterinario')),
  proveedor_id UUID NOT NULL REFERENCES usuarios(id),
  evento_id UUID NULL REFERENCES eventos(id),
  reservado_por UUID NULL REFERENCES usuarios(id),
  franja_inicio TIMESTAMPTZ NOT NULL,
  franja_fin TIMESTAMPTZ NOT NULL CHECK (franja_fin > franja_inicio),
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','reservado','cancelado')),
  asistio BOOLEAN NULL, -- se completa post-turno; base para métricas de no-show (Módulo 6)
  version INTEGER NOT NULL DEFAULT 0, -- control optimista de concurrencia en la reserva
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT ck_turnos_proveedor_evento CHECK (
    (proveedor_tipo = 'municipio' AND evento_id IS NOT NULL) OR
    (proveedor_tipo = 'veterinario' AND evento_id IS NULL)
  )
);
CREATE INDEX ix_turnos_proveedor_franja ON turnos (proveedor_id, franja_inicio);
CREATE INDEX ix_turnos_reservado_por ON turnos (reservado_por);
-- Reserva vía: UPDATE turnos SET estado='reservado', version=version+1, reservado_por=?
--              WHERE id=? AND estado='disponible' AND version=?  (anti doble-reserva)

CREATE TABLE vitrina_adopcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipio_id UUID NOT NULL REFERENCES usuarios(id),
  nombre_animal TEXT NOT NULL,
  especie TEXT NOT NULL,
  edad_aproximada SMALLINT NULL,
  tamano TEXT NULL CHECK (tamano IN ('pequeño','mediano','grande')),
  temperamento TEXT NULL,
  estado_salud TEXT NULL,
  requisitos_adopcion TEXT NULL,
  foto_url TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','adoptado','baja')),
  -- Columnas Post-MVP (Módulo 9), nullable hasta activar el algoritmo de compatibilidad
  nivel_energia TEXT NULL CHECK (nivel_energia IN ('bajo','medio','alto')),
  compatible_ninos BOOLEAN NULL,
  compatible_otros_animales BOOLEAN NULL,
  necesidades_medicas_detalle TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_vitrina_municipio_estado ON vitrina_adopcion (municipio_id, estado);
```

### Vistas materializadas — Dashboard Municipal

```sql
-- Alcance actual: instancia single-tenant (un municipio). Si se suma multi-municipio
-- en Post-MVP, agregar municipio_id a reportes/eventos y particionar estas vistas por él.
CREATE MATERIALIZED VIEW mv_metricas_reportes_periodo AS
SELECT date_trunc('week', created_at) AS periodo, tipo, estado, count(*) AS total
FROM reportes
WHERE deleted_at IS NULL
GROUP BY periodo, tipo, estado;

CREATE MATERIALIZED VIEW mv_metricas_turnos_periodo AS
SELECT date_trunc('week', franja_inicio) AS periodo, proveedor_tipo, estado, count(*) AS total
FROM turnos
WHERE deleted_at IS NULL
GROUP BY periodo, proveedor_tipo, estado;

-- Refrescar vía job asincrónico (ej. cron de Supabase Edge Function), nunca en el
-- request del dashboard: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_metricas_...;
```

## Módulo 4: Veterinarios — Libreta Sanitaria Básica

```sql
CREATE TABLE autorizaciones_libreta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mascota_id UUID NOT NULL REFERENCES mascotas(id),
  veterinario_id UUID NOT NULL REFERENCES usuarios(id),
  otorgada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  revocada_en TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_autorizacion_activa
  ON autorizaciones_libreta (mascota_id, veterinario_id) WHERE revocada_en IS NULL;

CREATE TABLE entradas_libreta_sanitaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mascota_id UUID NOT NULL REFERENCES mascotas(id),
  veterinario_id UUID NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('vacuna','visita','observacion')),
  descripcion TEXT NOT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_libreta_mascota_fecha ON entradas_libreta_sanitaria (mascota_id, fecha DESC);
CREATE INDEX ix_libreta_veterinario ON entradas_libreta_sanitaria (veterinario_id);
```

---

# 1.B — Esquema Post-MVP (extiende el esquema anterior; ninguna tabla del MVP se modifica de forma destructiva)

## Módulo 5: Red de Colaboración entre ONGs y Rescatistas

```sql
-- Rol 'rescatista' ya sembrado en tabla roles (Módulo 1). Sin perfil propio:
-- el relevamiento no define atributos distintivos más allá del rol.

CREATE TABLE solicitudes_recurso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('transito','insumos','asistencia_veterinaria','adopcion')),
  descripcion TEXT NOT NULL,
  reporte_id UUID NULL REFERENCES reportes(id),
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','cubierta','cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_solicitudes_organizacion_estado ON solicitudes_recurso (organizacion_id, estado);

CREATE TABLE colaboraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES solicitudes_recurso(id),
  stakeholder_id UUID NOT NULL REFERENCES usuarios(id),
  estado TEXT NOT NULL DEFAULT 'propuesta' CHECK (estado IN ('propuesta','aceptada','rechazada','completada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_colaboraciones_solicitud ON colaboraciones (solicitud_id);
CREATE INDEX ix_colaboraciones_stakeholder ON colaboraciones (stakeholder_id);
```

## Módulo 6: Veterinarios — Funcionalidades Avanzadas

```sql
CREATE TABLE productos_veterinario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veterinario_id UUID NOT NULL REFERENCES usuarios(id),
  nombre TEXT NOT NULL,
  descripcion TEXT NULL,
  precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_productos_vet ON productos_veterinario (veterinario_id) WHERE deleted_at IS NULL;

CREATE TABLE pedidos_producto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos_veterinario(id),
  comprador_id UUID NOT NULL REFERENCES usuarios(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_pedidos_comprador ON pedidos_producto (comprador_id);

-- Historia clínica interoperable entre veterinarios: requiere marco de responsabilidad
-- profesional definido formalmente antes de habilitarse en producción.
CREATE TABLE historiales_compartidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mascota_id UUID NOT NULL REFERENCES mascotas(id),
  veterinario_origen_id UUID NOT NULL REFERENCES usuarios(id),
  veterinario_destino_id UUID NOT NULL REFERENCES usuarios(id),
  autorizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  revocado_en TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_historial_veterinarios_distintos CHECK (veterinario_origen_id <> veterinario_destino_id)
);
```

## Módulo 7: Marketplace de Comerciantes

```sql
-- Rol 'comerciante' ya sembrado en tabla roles (Módulo 1).
CREATE TABLE comercios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  nombre_comercio TEXT NOT NULL,
  tipo_comercio TEXT NOT NULL
    CHECK (tipo_comercio IN ('pet_shop','forrajeria','peluqueria','farmacia_veterinaria','otro')),
  direccion TEXT NOT NULL,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  estado_verificacion TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado_verificacion IN ('pendiente','verificado','rechazado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_comercios_geo ON comercios (latitud, longitud);

CREATE TABLE productos_comercio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id UUID NOT NULL REFERENCES comercios(id),
  nombre TEXT NOT NULL,
  descripcion TEXT NULL,
  categoria TEXT NULL,
  precio NUMERIC(10,2) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_productos_comercio ON productos_comercio (comercio_id) WHERE deleted_at IS NULL;
```

## Módulo 8: Foros y Cursos de Bienestar Animal

```sql
CREATE TABLE cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publicado_por UUID NOT NULL REFERENCES usuarios(id),
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  contenido_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE inscripciones_curso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES cursos(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  inscrito_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ux_inscripcion_curso_usuario UNIQUE (curso_id, usuario_id)
);

CREATE TABLE temas_foro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por UUID NOT NULL REFERENCES usuarios(id),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE respuestas_foro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_id UUID NOT NULL REFERENCES temas_foro(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_respuestas_tema ON respuestas_foro (tema_id) WHERE deleted_at IS NULL;
```

## Módulo 9: Algoritmo de Compatibilidad de Adopción

```sql
-- Atributos estructurados del animal: ya agregados como columnas nullable
-- en vitrina_adopcion (Módulo 3) — ver sección anterior.

CREATE TABLE cuestionarios_adoptante (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  horas_solo_estimadas SMALLINT NULL CHECK (horas_solo_estimadas >= 0),
  presencia_ninos BOOLEAN NULL,
  espacio_disponible TEXT NULL
    CHECK (espacio_disponible IN ('departamento','casa_patio_pequeño','casa_patio_grande')),
  experiencia_previa TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_cuestionarios_usuario ON cuestionarios_adoptante (usuario_id);

-- Registro auditable de cada sugerencia generada: sostiene la métrica de
-- reducción de devoluciones (comparar score vs. resultado real de la adopción).
CREATE TABLE sugerencias_compatibilidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuestionario_id UUID NOT NULL REFERENCES cuestionarios_adoptante(id),
  vitrina_adopcion_id UUID NOT NULL REFERENCES vitrina_adopcion(id),
  score_compatibilidad NUMERIC(5,4) NOT NULL CHECK (score_compatibilidad BETWEEN 0 AND 1),
  metodo TEXT NOT NULL CHECK (metodo IN ('reglas','semantico','llm')),
  generado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_sugerencias_cuestionario ON sugerencias_compatibilidad (cuestionario_id, score_compatibilidad DESC);
```
