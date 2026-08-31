## 1. Estrategia del Lote de Datos de Prueba

- **Motor de ejecución:** SQL puro contra PostgreSQL/Supabase (no Prisma Client), para que el script sea auditable línea por línea y ejecutable directo en `psql` o el SQL Editor de Supabase, en un único `BEGIN/COMMIT`.
- **Orden de inserción:** estrictamente por dependencia de clave foránea (`roles` → `usuarios` → perfiles/verificaciones → `mascotas` → `reportes` → resto de módulos), usando tablas temporales (`CREATE TEMP TABLE ... AS WITH ins AS (INSERT ... RETURNING id) SELECT ...`) para reutilizar los `UUID` generados en tablas hijas sin hardcodearlos.
- **Variedad sin miles de líneas manuales:** nombres, razas, direcciones y descripciones se generan combinando `generate_series` con arrays de valores realistas (indexados con `random()`), en vez de listar cada fila a mano.
- **Distribución temporal:** `created_at`/`franja_inicio` distribuidos en las últimas 8 semanas (`now() - random() * interval '56 days'`), para poder probar filtros por período y las vistas materializadas del dashboard con datos no planos.
- **Geolocalización:** jitter aleatorio (±~5 km) alrededor de las coordenadas de Coronel Pringles (`-37.9989, -61.3565`), coherente con el alcance single-tenant documentado en el esquema.
- **Volumen orientado a paginación real:** toda entidad con listado paginado (tope de 50 registros/página, NFR de Rendimiento) recibe un volumen superior a 50 filas, para que la paginación, los filtros y la búsqueda semántica (`pgvector`) se prueben contra un dataset no trivial.
- **Separación 1.A / 1.B:** Bloque 1 (MVP) con volumen pensado para la demo y pruebas de carga básicas; Bloque 2 (Post-MVP) con volumen menor, suficiente para validar integridad referencial de los módulos 5–9 antes de que exista UI que los consuma.
- **⚠️ Caveat de autenticación:** el esquema modela `usuarios.password_hash` como columna propia, pero el stack define **Supabase Auth** como proveedor de autenticación real (tabla protegida `auth.users`). Este script siembra `public.usuarios` de forma independiente con un hash de relleno — **válido únicamente para entornos locales de desarrollo**. En staging/producción, el alta de usuarios de prueba debe hacerse vía `supabase.auth.admin.createUser()` (o el seeding de Supabase CLI), sincronizando `usuarios.id` con `auth.users.id`; nunca insertando directamente en `auth.users` por SQL crudo.
- **Aislamiento:** el script no toca `roles` si ya existen (`ON CONFLICT DO NOTHING`), para poder re-ejecutarse en un entorno con las migraciones ya aplicadas sin duplicar el catálogo de roles.

---

## 2. Volumen por Entidad

### Bloque 1.A — MVP

| Entidad | Volumen | Justificación |
|---|---|---|
| roles | 7 (incluye `organizacion`, id 7, ver `ROLES.md`) | Catálogo fijo |
| usuarios (dueño) | 120 | Base para mascotas, reportes y turnos con variedad real |
| usuarios (veterinario) | 8 | Suficiente para probar agenda/turnera distribuida entre varios proveedores |
| usuarios (municipio) | 1 | Alcance single-tenant documentado en el esquema |
| usuarios (administrador) | 2 | Uno activo + uno de respaldo |
| perfiles_veterinario | 8 | 1:1 con veterinarios |
| perfiles_municipio | 1 | 1:1 con el municipio |
| verificaciones | 10 | Mezcla `pendiente`/`aprobado`/`rechazado` para probar la cola del Admin |
| mascotas | 180 | ~1.5 mascotas por dueño en promedio |
| reportes | 220 | >50 para paginación; mezcla de `tipo`/`estado`/`especie`; alimenta embeddings y mapas de calor; incluye 1 par 'perdido'/'encontrado' garantizado coincidente en zona+especie para REP-U-06 |
| reportes_historial_estado | ~380 | 1 a 3 transiciones por reporte |
| notificaciones | ~300 | Mezcla leído/no leído por usuario |
| eventos | 15 | Pasados y futuros, para calendario y dashboard |
| disponibilidad_veterinario | 40 | ~5 franjas semanales por veterinario |
| turnos | 260 | >50 para paginación; mezcla proveedor municipio/veterinario y estado |
| vitrina_adopcion | 60 | >50 para paginación de la vitrina pública |
| autorizaciones_libreta | 70 | Mezcla activas/revocadas |
| entradas_libreta_sanitaria | 160 | Varias entradas por mascota autorizada |

### Bloque 1.B — Post-MVP (volumen mínimo de integridad, no de carga)

| Entidad | Volumen | Justificación |
|---|---|---|
| usuarios (rescatista) | 15 | Suficiente para probar colaboraciones cruzadas |
| usuarios (comerciante) | 12 | 1:1 con comercios |
| usuarios (organizacion) | 10 | Requiere el rol agregado en `ROLES.md` |
| solicitudes_recurso | 60 | >50 para paginación futura |
| colaboraciones | 90 | 1 a 2 ofertas por solicitud |
| productos_veterinario | 50 | Catálogo por veterinario |
| pedidos_producto | 70 | Mezcla de estados |
| historiales_compartidos | 15 | Volumen bajo por naturaleza sensible del caso de uso |
| comercios | 12 | 1:1 con usuarios comerciante |
| productos_comercio | 90 | Catálogo por comercio |
| cursos | 20 | Publicados por municipio/organización |
| inscripciones_curso | 150 | Varias por curso |
| temas_foro | 70 | >50 para paginación del foro |
| respuestas_foro | 300 | Varias respuestas por tema |
| cuestionarios_adoptante | 40 | Uno por adoptante potencial |
| sugerencias_compatibilidad | 150 | Varias sugerencias por cuestionario |

---

## 3. Script / Configuración de Siembra (SQL)

```sql
BEGIN;

-- =====================================================================
-- BLOQUE 1.A — MVP
-- =====================================================================

-- 1. Roles (idempotente)
INSERT INTO roles (id, nombre) VALUES
  (1,'dueño'), (2,'veterinario'), (3,'municipio'), (4,'administrador'),
  (5,'rescatista'), (6,'comerciante'), (7,'organizacion')
ON CONFLICT (id) DO NOTHING;

-- 2. Usuarios: Dueños de mascota
CREATE TEMP TABLE tmp_dueños AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  SELECT 'dueño' || gs || '@ejemplo.test',
         '$2b$10$devSeedOnlyNotForProduction00000000000000000000000',
         1, 'no_requerido'
  FROM generate_series(1, 120) AS gs
  RETURNING id
)
SELECT id, row_number() OVER () AS rn FROM ins;

-- 3. Usuarios: Veterinarios
CREATE TEMP TABLE tmp_veterinarios AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  SELECT 'vet' || gs || '@ejemplo.test',
         '$2b$10$devSeedOnlyNotForProduction00000000000000000000000',
         2, (ARRAY['pendiente','verificado','verificado','verificado'])[1 + floor(random()*4)::int]
  FROM generate_series(1, 8) AS gs
  RETURNING id
)
SELECT id, row_number() OVER () AS rn FROM ins;

-- 4. Usuario: Municipio (single-tenant)
CREATE TEMP TABLE tmp_municipio AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  VALUES ('municipio.pringles@ejemplo.test',
          '$2b$10$devSeedOnlyNotForProduction00000000000000000000000',
          3, 'verificado')
  RETURNING id
)
SELECT id FROM ins;

-- 5. Usuarios: Administradores
INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
VALUES
  ('admin1@ejemplo.test', '$2b$10$devSeedOnlyNotForProduction00000000000000000000000', 4, 'no_requerido'),
  ('admin2@ejemplo.test', '$2b$10$devSeedOnlyNotForProduction00000000000000000000000', 4, 'no_requerido');

-- 6. Perfiles de veterinario
INSERT INTO perfiles_veterinario (usuario_id, matricula, colegio_emisor, verificado_en)
SELECT id, 'MP-' || (1000 + rn), 'Colegio de Veterinarios de la Provincia de Buenos Aires',
       CASE WHEN random() < 0.75 THEN now() - (random()*30 || ' days')::interval ELSE NULL END
FROM tmp_veterinarios;

-- 7. Perfil de municipio
INSERT INTO perfiles_municipio (usuario_id, nombre_institucional, verificado_en)
SELECT id, 'Municipalidad de Coronel Pringles — Zoonosis', now() - interval '10 days'
FROM tmp_municipio;

-- 8. Verificaciones (veterinarios + municipio)
INSERT INTO verificaciones (usuario_id, tipo, estado, motivo_rechazo, resuelto_en)
SELECT id, 'veterinario',
       (ARRAY['pendiente','aprobado','aprobado','rechazado'])[1 + floor(random()*4)::int],
       CASE WHEN random() < 0.15 THEN 'Matrícula no encontrada en el padrón del colegio' ELSE NULL END,
       CASE WHEN random() < 0.75 THEN now() - (random()*20 || ' days')::interval ELSE NULL END
FROM tmp_veterinarios;

INSERT INTO verificaciones (usuario_id, tipo, estado, resuelto_en)
SELECT id, 'municipio', 'aprobado', now() - interval '15 days' FROM tmp_municipio;

-- 9. Mascotas
CREATE TEMP TABLE tmp_mascotas AS
WITH ins AS (
  INSERT INTO mascotas (dueño_id, nombre, especie, raza, edad_aproximada, foto_url, identificacion_chip)
  SELECT
    (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1),
    (ARRAY['Toby','Luna','Rocky','Nina','Max','Bella','Simba','Michi','Firulais','Kiara','Thor','Coco','Duke','Mia','Rex'])[1 + floor(random()*15)::int],
    (ARRAY['perro','gato'])[1 + floor(random()*2)::int],
    (ARRAY['Mestizo','Labrador','Caniche','Siamés','Ovejero Alemán','Común Europeo','Bulldog','Fox Terrier'])[1 + floor(random()*8)::int],
    floor(random()*14)::smallint,
    'https://res.cloudinary.com/patitas-en-alerta/mascotas/seed-' || gs || '.jpg',
    CASE WHEN random() < 0.3 THEN lpad((900000000 + gs)::text, 15, '0') ELSE NULL END
  FROM generate_series(1, 180) AS gs
  RETURNING id, dueño_id
)
SELECT id, dueño_id, row_number() OVER () AS rn FROM ins;

-- 10. Reportes (218 aleatorios + 2 garantizados más abajo = 220 en total)
CREATE TEMP TABLE tmp_reportes AS
WITH ins AS (
  INSERT INTO reportes (tipo, subtipo, reportado_por, mascota_id, descripcion, foto_url,
                         latitud, longitud, especie, estado, created_at)
  SELECT
    t.tipo,
    CASE WHEN t.tipo = 'problematica'
         THEN (ARRAY['animal_suelto','foco_sanitario','accidente_vial'])[1 + floor(random()*3)::int]
         ELSE NULL END,
    (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1),
    CASE WHEN t.tipo IN ('perdido','encontrado') AND random() < 0.6
         THEN (SELECT id FROM tmp_mascotas ORDER BY random() LIMIT 1) ELSE NULL END,
    CASE t.tipo
      WHEN 'perdido' THEN 'Se perdió cerca de la zona, responde a su nombre, muy sociable.'
      WHEN 'encontrado' THEN 'Encontrado deambulando solo, buen estado general, sin colisión visible.'
      ELSE 'Se observa animal suelto en la vía pública, posible riesgo para el tránsito.'
    END,
    'https://res.cloudinary.com/patitas-en-alerta/reportes/seed-' || gs || '.jpg',
    -37.9989 + (random() - 0.5) * 0.08,
    -61.3565 + (random() - 0.5) * 0.08,
    -- 10% sin especie declarada (texto libre): EvaluarCoincidenciaReporte
    -- (REP-U-06) omite la búsqueda de coincidencias para esos casos.
    CASE WHEN t.tipo IN ('perdido','encontrado') AND random() < 0.9
         THEN (ARRAY['perro','gato'])[1 + floor(random()*2)::int] ELSE NULL END,
    t.estado,
    now() - (random() * 56 || ' days')::interval
  FROM generate_series(1, 218) AS gs
  CROSS JOIN LATERAL (
    SELECT
      (ARRAY['perdido','encontrado','problematica'])[1 + floor(random()*3)::int] AS tipo,
      (ARRAY['reportado','en_revision','en_atencion','resuelto','cerrado'])[1 + floor(random()*5)::int] AS estado
  ) t
  RETURNING id, estado
)
SELECT id, estado, row_number() OVER () AS rn FROM ins;

-- Par garantizado 'perdido' ↔ 'encontrado' coincidente en zona (~100m,
-- muy por debajo del radio de 5km de EvaluarCoincidenciaReporte) y especie
-- ('perro'), ambos activos ('reportado') — para poder demostrar/probar la
-- notificación reporte_coincidente sin depender del azar del bloque anterior.
-- Deliberadamente fuera de tmp_reportes: no participa del historial de
-- estado (sección 11) ni de las notificaciones aleatorias (sección 12).
INSERT INTO reportes (tipo, subtipo, reportado_por, mascota_id, descripcion, foto_url,
                       latitud, longitud, especie, estado, created_at)
VALUES
  ('perdido', NULL, (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1), NULL,
   'Mi perro Toby se perdió cerca de la plaza central, es muy sociable.',
   'https://res.cloudinary.com/patitas-en-alerta/reportes/seed-match-perdido.jpg',
   -37.9989, -61.3565, 'perro', 'reportado', now() - interval '2 days'),
  ('encontrado', NULL, (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1), NULL,
   'Encontré un perro suelto cerca de la plaza central, parece perdido.',
   'https://res.cloudinary.com/patitas-en-alerta/reportes/seed-match-encontrado.jpg',
   -37.9995, -61.3560, 'perro', 'reportado', now() - interval '1 day');

-- 11. Historial de estado de reportes (1 a 3 transiciones por reporte,
-- siguiendo el mismo camino lineal sin atajos que valida
-- CambiarEstadoReporteCommand vía ReporteEstado — State, sin condicionales
-- dispersos: reportado → en_revision → en_atencion → resuelto → cerrado.
-- Saltar directo de 'reportado' a 'cerrado' se rechaza con PEA-REP-006, así
-- que el historial nunca puede registrar ese salto tampoco.
INSERT INTO reportes_historial_estado (reporte_id, estado_anterior, estado_nuevo, usuario_id, registrado_en)
SELECT
  p.reporte_id,
  (ARRAY['reportado', 'en_revision', 'en_atencion', 'resuelto'])[p.paso],
  (ARRAY['en_revision', 'en_atencion', 'resuelto', 'cerrado'])[p.paso],
  (SELECT id FROM tmp_municipio),
  p.base + (p.paso || ' days')::interval
FROM (
  SELECT r.id AS reporte_id, r.base, gs AS paso
  FROM (
    SELECT id, now() - (random() * 40 || ' days')::interval AS base,
           1 + floor(random() * 3)::int AS cantidad_pasos
    FROM tmp_reportes
    WHERE estado <> 'reportado'
  ) r
  CROSS JOIN LATERAL generate_series(1, r.cantidad_pasos) AS gs
) p;

-- 12. Notificaciones
INSERT INTO notificaciones (usuario_id, tipo, referencia_tabla, referencia_id, leido, created_at)
SELECT
  (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1),
  'reporte_coincidente', 'reportes',
  (SELECT id FROM tmp_reportes ORDER BY random() LIMIT 1),
  random() < 0.5,
  now() - (random() * 30 || ' days')::interval
FROM generate_series(1, 300);

-- 13. Eventos municipales
CREATE TEMP TABLE tmp_eventos AS
WITH ins AS (
  INSERT INTO eventos (municipio_id, titulo, tipo, direccion, latitud, longitud, fecha, cupos_totales, requisitos)
  SELECT
    (SELECT id FROM tmp_municipio),
    'Jornada de ' || et.tipo || ' — Barrio ' || (ARRAY['Norte','Sur','Centro','Estación','Villa Iris'])[1 + floor(random()*5)::int],
    et.tipo,
    'Calle ' || (10 + floor(random()*90))::int || ' N° ' || (100 + floor(random()*900))::int,
    -37.9989 + (random() - 0.5) * 0.06,
    -61.3565 + (random() - 0.5) * 0.06,
    now() + (random() * 60 - 20 || ' days')::interval,
    (ARRAY[20,30,40,50])[1 + floor(random()*4)::int],
    'Traer a la mascota con collar/bozal y DNI del tutor.'
  FROM generate_series(1, 15) AS gs
  CROSS JOIN LATERAL (
    SELECT (ARRAY['castracion','vacunacion','desparasitacion'])[1 + floor(random()*3)::int] AS tipo
  ) et
  RETURNING id
)
SELECT id, row_number() OVER () AS rn FROM ins;

-- 14. Disponibilidad de veterinarios (plantilla semanal)
INSERT INTO disponibilidad_veterinario (veterinario_id, dia_semana, hora_inicio, hora_fin)
SELECT v.id, d.dia, '09:00', '13:00'
FROM tmp_veterinarios v
CROSS JOIN LATERAL (SELECT unnest(ARRAY[1,2,3,4,5]) AS dia) d
WHERE random() < 0.7;

-- 15. Turnos (motor compartido municipio + veterinario)
INSERT INTO turnos (proveedor_tipo, proveedor_id, evento_id, reservado_por,
                     franja_inicio, franja_fin, estado)
SELECT
  'municipio',
  (SELECT id FROM tmp_municipio),
  e.id,
  CASE WHEN random() < 0.6 THEN (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1) ELSE NULL END,
  ts.inicio, ts.inicio + interval '20 minutes',
  CASE WHEN random() < 0.6 THEN 'reservado' WHEN random() < 0.9 THEN 'disponible' ELSE 'cancelado' END
FROM tmp_eventos e
CROSS JOIN LATERAL (
  SELECT (SELECT fecha FROM eventos WHERE id = e.id) + (s * interval '20 minutes') AS inicio
  FROM generate_series(0, 9) AS s
) ts;

INSERT INTO turnos (proveedor_tipo, proveedor_id, evento_id, reservado_por,
                     franja_inicio, franja_fin, estado)
SELECT
  'veterinario',
  v.id,
  NULL,
  CASE WHEN random() < 0.5 THEN (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1) ELSE NULL END,
  ts.inicio, ts.inicio + interval '30 minutes',
  CASE WHEN random() < 0.5 THEN 'reservado' WHEN random() < 0.85 THEN 'disponible' ELSE 'cancelado' END
FROM tmp_veterinarios v
CROSS JOIN LATERAL (
  SELECT now() + ((s || ' days')::interval) + time '09:00' AS inicio
  FROM generate_series(1, 10) AS s
) ts;

-- 16. Vitrina de adopción
INSERT INTO vitrina_adopcion (municipio_id, nombre_animal, especie, edad_aproximada, tamano,
                               temperamento, estado_salud, requisitos_adopcion, foto_url, estado)
SELECT
  (SELECT id FROM tmp_municipio),
  (ARRAY['Toby','Luna','Rocky','Nina','Max','Bella','Simba','Michi','Kiara','Coco'])[1 + floor(random()*10)::int] || ' ' || gs,
  (ARRAY['perro','gato'])[1 + floor(random()*2)::int],
  floor(random()*10)::smallint,
  (ARRAY['pequeño','mediano','grande'])[1 + floor(random()*3)::int],
  (ARRAY['Sociable','Tranquilo','Juguetón','Tímido al principio, luego cariñoso'])[1 + floor(random()*4)::int],
  (ARRAY['Sano, castrado y vacunado','En recuperación, vacunas al día','Sano, pendiente castración'])[1 + floor(random()*3)::int],
  'Adoptante mayor de 18 años, se realiza visita previa a la vivienda.',
  'https://res.cloudinary.com/patitas-en-alerta/adopcion/seed-' || gs || '.jpg',
  (ARRAY['disponible','disponible','disponible','adoptado','baja'])[1 + floor(random()*5)::int]
FROM generate_series(1, 60) AS gs;

-- 17. Autorizaciones de libreta sanitaria
INSERT INTO autorizaciones_libreta (mascota_id, veterinario_id, otorgada_en, revocada_en)
SELECT
  (SELECT id FROM tmp_mascotas ORDER BY random() LIMIT 1),
  (SELECT id FROM tmp_veterinarios ORDER BY random() LIMIT 1),
  now() - (random()*90 || ' days')::interval,
  CASE WHEN random() < 0.15 THEN now() - (random()*10 || ' days')::interval ELSE NULL END
FROM generate_series(1, 70)
ON CONFLICT DO NOTHING;

-- 18. Entradas de libreta sanitaria
INSERT INTO entradas_libreta_sanitaria (mascota_id, veterinario_id, tipo, descripcion, fecha)
SELECT
  al.mascota_id, al.veterinario_id,
  (ARRAY['vacuna','visita','observacion'])[1 + floor(random()*3)::int],
  (ARRAY['Vacuna antirrábica anual','Control clínico de rutina','Desparasitación interna',
         'Observación: leve sobrepeso, se sugiere ajuste de dieta'])[1 + floor(random()*4)::int],
  (now() - (random()*180 || ' days')::interval)::date
FROM autorizaciones_libreta al, generate_series(1, 3)
WHERE al.revocada_en IS NULL
LIMIT 160;

REFRESH MATERIALIZED VIEW mv_metricas_reportes_periodo;
REFRESH MATERIALIZED VIEW mv_metricas_turnos_periodo;

-- =====================================================================
-- BLOQUE 1.B — POST-MVP (integridad referencial, volumen mínimo)
-- =====================================================================

-- 19. Usuarios: rescatistas, comerciantes, organizaciones
CREATE TEMP TABLE tmp_rescatistas AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  SELECT 'rescatista' || gs || '@ejemplo.test',
         '$2b$10$devSeedOnlyNotForProduction00000000000000000000000', 5, 'no_requerido'
  FROM generate_series(1, 15) AS gs RETURNING id
) SELECT id FROM ins;

CREATE TEMP TABLE tmp_comerciantes AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  SELECT 'comerciante' || gs || '@ejemplo.test',
         '$2b$10$devSeedOnlyNotForProduction00000000000000000000000', 6, 'verificado'
  FROM generate_series(1, 12) AS gs RETURNING id
) SELECT id, row_number() OVER () AS rn FROM ins;

CREATE TEMP TABLE tmp_organizaciones AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  SELECT 'ong' || gs || '@ejemplo.test',
         '$2b$10$devSeedOnlyNotForProduction00000000000000000000000', 7, 'verificado'
  FROM generate_series(1, 10) AS gs RETURNING id
) SELECT id FROM ins;

-- 20. Red de colaboración
CREATE TEMP TABLE tmp_solicitudes AS
WITH ins AS (
  INSERT INTO solicitudes_recurso (organizacion_id, tipo, descripcion, reporte_id, estado)
  SELECT
    (SELECT id FROM tmp_organizaciones ORDER BY random() LIMIT 1),
    (ARRAY['transito','insumos','asistencia_veterinaria','adopcion'])[1 + floor(random()*4)::int],
    'Solicitud generada para pruebas de integración de la Red de Colaboración.',
    CASE WHEN random() < 0.4 THEN (SELECT id FROM tmp_reportes ORDER BY random() LIMIT 1) ELSE NULL END,
    (ARRAY['abierta','abierta','cubierta','cancelada'])[1 + floor(random()*4)::int]
  FROM generate_series(1, 60)
  RETURNING id
) SELECT id FROM ins;

INSERT INTO colaboraciones (solicitud_id, stakeholder_id, estado)
SELECT
  (SELECT id FROM tmp_solicitudes ORDER BY random() LIMIT 1),
  (SELECT id FROM tmp_rescatistas ORDER BY random() LIMIT 1),
  (ARRAY['propuesta','aceptada','rechazada','completada'])[1 + floor(random()*4)::int]
FROM generate_series(1, 90);

-- 21. Veterinarios avanzado
CREATE TEMP TABLE tmp_productos_vet AS
WITH ins AS (
  INSERT INTO productos_veterinario (veterinario_id, nombre, descripcion, precio, stock)
  SELECT
    (SELECT id FROM tmp_veterinarios ORDER BY random() LIMIT 1),
    (ARRAY['Antipulgas x1','Alimento balanceado 3kg','Shampoo dermatológico','Vacuna séxtuple (aplicación)'])[1 + floor(random()*4)::int],
    'Producto de venta directa en la clínica veterinaria.',
    (random()*15000 + 1000)::numeric(10,2),
    floor(random()*50)::int
  FROM generate_series(1, 50) RETURNING id
) SELECT id FROM ins;

INSERT INTO pedidos_producto (producto_id, comprador_id, cantidad, precio_unitario, estado)
SELECT
  (SELECT id FROM tmp_productos_vet ORDER BY random() LIMIT 1),
  (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1),
  1 + floor(random()*3)::int,
  (random()*15000 + 1000)::numeric(10,2),
  (ARRAY['pendiente','confirmado','cancelado'])[1 + floor(random()*3)::int]
FROM generate_series(1, 70);

INSERT INTO historiales_compartidos (mascota_id, veterinario_origen_id, veterinario_destino_id, revocado_en)
SELECT
  (SELECT id FROM tmp_mascotas ORDER BY random() LIMIT 1),
  v1.id, v2.id,
  CASE WHEN random() < 0.2 THEN now() - (random()*10 || ' days')::interval ELSE NULL END
FROM (SELECT id FROM tmp_veterinarios ORDER BY random() LIMIT 15) v1,
     (SELECT id FROM tmp_veterinarios ORDER BY random() LIMIT 15) v2
WHERE v1.id <> v2.id
LIMIT 15;

-- 22. Marketplace de comerciantes
CREATE TEMP TABLE tmp_comercios AS
WITH ins AS (
  INSERT INTO comercios (usuario_id, nombre_comercio, tipo_comercio, direccion, latitud, longitud, estado_verificacion)
  SELECT
    c.id,
    'Comercio ' || c.rn,
    (ARRAY['pet_shop','forrajeria','peluqueria','farmacia_veterinaria','otro'])[1 + floor(random()*5)::int],
    'Av. San Martín ' || (100 + floor(random()*900))::int,
    -37.9989 + (random() - 0.5) * 0.05,
    -61.3565 + (random() - 0.5) * 0.05,
    (ARRAY['pendiente','verificado','verificado'])[1 + floor(random()*3)::int]
  FROM tmp_comerciantes c
  RETURNING id
) SELECT id FROM ins;

INSERT INTO productos_comercio (comercio_id, nombre, descripcion, categoria, precio)
SELECT
  (SELECT id FROM tmp_comercios ORDER BY random() LIMIT 1),
  (ARRAY['Balanceado premium 15kg','Correa reforzada','Cama ortopédica','Juguete interactivo','Arena sanitaria 10L'])[1 + floor(random()*5)::int],
  'Producto publicado por comercio adherido a la plataforma.',
  (ARRAY['alimento','accesorios','higiene','juguetes'])[1 + floor(random()*4)::int],
  (random()*20000 + 2000)::numeric(10,2)
FROM generate_series(1, 90);

-- 23. Foros y cursos
CREATE TEMP TABLE tmp_cursos AS
WITH ins AS (
  INSERT INTO cursos (publicado_por, titulo, descripcion, contenido_url)
  SELECT
    (SELECT id FROM tmp_organizaciones ORDER BY random() LIMIT 1),
    (ARRAY['Tenencia responsable básica','Primeros auxilios para mascotas','Nutrición canina y felina','Socialización de cachorros'])[1 + floor(random()*4)::int] || ' — Edición ' || gs,
    'Curso introductorio orientado a tutores de mascotas de la comunidad.',
    'https://cdn.patitasenalerta.test/cursos/seed-' || gs
  FROM generate_series(1, 20) AS gs
  RETURNING id
) SELECT id FROM ins;

INSERT INTO inscripciones_curso (curso_id, usuario_id)
SELECT DISTINCT ON (curso_id, usuario_id)
  (SELECT id FROM tmp_cursos ORDER BY random() LIMIT 1),
  (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1)
FROM generate_series(1, 250)
LIMIT 150;

CREATE TEMP TABLE tmp_temas_foro AS
WITH ins AS (
  INSERT INTO temas_foro (creado_por, titulo, contenido)
  SELECT
    (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1),
    (ARRAY['¿Cómo sé si mi perro está bien de peso?','Recomendaciones para la primera visita al veterinario',
           '¿Cada cuánto desparasitar a un gato adulto?','Tips para adaptar a un rescatado al hogar'])[1 + floor(random()*4)::int] || ' #' || gs,
    'Consulta de la comunidad sobre bienestar y cuidado de mascotas.'
  FROM generate_series(1, 70) AS gs
  RETURNING id
) SELECT id FROM ins;

INSERT INTO respuestas_foro (tema_id, usuario_id, contenido)
SELECT
  (SELECT id FROM tmp_temas_foro ORDER BY random() LIMIT 1),
  (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1),
  'Respuesta de prueba con recomendación general de la comunidad.'
FROM generate_series(1, 300);

-- 24. Algoritmo de compatibilidad de adopción
CREATE TEMP TABLE tmp_cuestionarios AS
WITH ins AS (
  INSERT INTO cuestionarios_adoptante (usuario_id, horas_solo_estimadas, presencia_ninos,
                                        espacio_disponible, experiencia_previa)
  SELECT
    (SELECT id FROM tmp_dueños ORDER BY random() LIMIT 1),
    floor(random()*10)::smallint,
    random() < 0.4,
    (ARRAY['departamento','casa_patio_pequeño','casa_patio_grande'])[1 + floor(random()*3)::int],
    'Tuvo mascotas anteriormente, experiencia básica en cuidados generales.'
  FROM generate_series(1, 40)
  RETURNING id
) SELECT id FROM ins;

INSERT INTO sugerencias_compatibilidad (cuestionario_id, vitrina_adopcion_id, score_compatibilidad, metodo)
SELECT
  (SELECT id FROM tmp_cuestionarios ORDER BY random() LIMIT 1),
  id,
  round((random()*0.6 + 0.4)::numeric, 4),
  (ARRAY['reglas','semantico'])[1 + floor(random()*2)::int]
FROM vitrina_adopcion
CROSS JOIN generate_series(1, 3)
LIMIT 150;

COMMIT;
```
