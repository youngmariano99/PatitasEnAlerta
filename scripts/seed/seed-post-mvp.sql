-- Siembra del Bloque 1.B (Post-MVP, Módulos 5-9): rescatistas, comerciantes,
-- organizaciones, Red de Colaboración, catálogo avanzado de veterinarios,
-- marketplace de comerciantes, foros/cursos y algoritmo de compatibilidad de
-- adopción. Adaptado 1:1 del bloque "BLOQUE 1.B — POST-MVP" de docs/SEED.md
-- (mismos volúmenes, misma lógica) — a diferencia del script maestro, este
-- no depende de las tablas temporales del Bloque 1.A (tmp_dueños/
-- tmp_veterinarios/tmp_mascotas/tmp_reportes): selecciona directo de las
-- tablas reales, así se puede correr de forma independiente siempre que ya
-- existan dueños, veterinarios, mascotas, reportes y el municipio.
--
-- Direcciones: mismo criterio que el resto del seed — calle real de Coronel
-- Pringles + altura al azar, siempre con el sufijo fijo
-- ", Coronel Pringles, Buenos Aires (B7530)" (ver docs/SEED.md, Sección 1).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-duenos.sql        -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-veterinarios.sql  -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-mascotas.sql      -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-municipio.sql     -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-reportes.sql      -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-post-mvp.sql

BEGIN;

INSERT INTO roles (id, nombre) VALUES
  (1,'dueño'), (2,'veterinario'), (3,'municipio'), (4,'administrador'),
  (5,'rescatista'), (6,'comerciante'), (7,'organizacion')
ON CONFLICT (id) DO NOTHING;

-- 1. Usuarios: rescatistas, comerciantes, organizaciones
-- latitud/longitud (rescatistas/organizaciones): mismo jitter que los
-- veterinarios del Bloque 1.A — sostiene el filtro de zona del directorio de
-- aliados (ListarDirectorioAliados.ts, Módulo 5). comerciantes queda fuera:
-- no es un rol del directorio de aliados (docs/REQUISITOS.md línea 85).
CREATE TEMP TABLE tmp_rescatistas AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion, latitud, longitud)
  SELECT 'rescatista' || gs || '@ejemplo.test',
         '$2b$10$devSeedOnlyNotForProduction00000000000000000000000', 5, 'no_requerido',
         -37.9989 + (random() - 0.5) * 0.08,
         -61.3565 + (random() - 0.5) * 0.08
  FROM generate_series(1, 100) AS gs RETURNING id
) SELECT id FROM ins;

CREATE TEMP TABLE tmp_comerciantes AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  SELECT 'comerciante' || gs || '@ejemplo.test',
         '$2b$10$devSeedOnlyNotForProduction00000000000000000000000', 6, 'verificado'
  FROM generate_series(1, 80) AS gs RETURNING id
) SELECT id, row_number() OVER () AS rn FROM ins;

CREATE TEMP TABLE tmp_organizaciones AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion, latitud, longitud)
  SELECT 'ong' || gs || '@ejemplo.test',
         '$2b$10$devSeedOnlyNotForProduction00000000000000000000000', 7, 'verificado',
         -37.9989 + (random() - 0.5) * 0.08,
         -61.3565 + (random() - 0.5) * 0.08
  FROM generate_series(1, 50) AS gs RETURNING id
) SELECT id FROM ins;

-- 2. Red de colaboración
CREATE TEMP TABLE tmp_solicitudes AS
WITH ins AS (
  INSERT INTO solicitudes_recurso (organizacion_id, tipo, descripcion, reporte_id, estado)
  SELECT
    (SELECT id FROM tmp_organizaciones ORDER BY random() LIMIT 1),
    (ARRAY['transito','insumos','asistencia_veterinaria','adopcion'])[1 + floor(random()*4)::int],
    'Solicitud generada para pruebas de integración de la Red de Colaboración.',
    CASE WHEN random() < 0.4 THEN (SELECT id FROM reportes WHERE deleted_at IS NULL ORDER BY random() LIMIT 1) ELSE NULL END,
    (ARRAY['abierta','abierta','cubierta','cancelada'])[1 + floor(random()*4)::int]
  FROM generate_series(1, 400)
  RETURNING id
) SELECT id FROM ins;

-- Muestreo sin reemplazo sobre el cross join de solicitudes x rescatistas
-- (cada par aparece una única vez por construcción) en vez de tirar dos
-- `random() LIMIT 1` independientes por fila: con 400 solicitudes x 100
-- rescatistas (40.000 pares posibles), 600 sorteos independientes tendrían
-- probabilidad real de repetir un mismo par y violar
-- `ux_colaboraciones_solicitud_stakeholder` (docs/SCHEMA.md).
INSERT INTO colaboraciones (solicitud_id, stakeholder_id, estado)
SELECT solicitud_id, stakeholder_id, estado
FROM (
  SELECT
    s.id AS solicitud_id,
    r.id AS stakeholder_id,
    (ARRAY['propuesta','aceptada','rechazada','completada'])[1 + floor(random()*4)::int] AS estado
  FROM tmp_solicitudes s
  CROSS JOIN tmp_rescatistas r
  ORDER BY random()
  LIMIT 600
) muestra;

-- 3. Veterinarios avanzado — requiere veterinarios ya sembrados (seed-veterinarios.sql)
INSERT INTO productos_veterinario (veterinario_id, nombre, descripcion, precio, stock)
SELECT
  (SELECT id FROM usuarios WHERE rol_id = 2 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
  (ARRAY['Antipulgas x1','Alimento balanceado 3kg','Shampoo dermatológico','Vacuna séxtuple (aplicación)'])[1 + floor(random()*4)::int],
  'Producto de venta directa en la clínica veterinaria.',
  (random()*15000 + 1000)::numeric(10,2),
  floor(random()*50)::int
FROM generate_series(1, 400)
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 2 AND deleted_at IS NULL);

INSERT INTO pedidos_producto (producto_id, comprador_id, cantidad, precio_unitario, estado)
SELECT
  (SELECT id FROM productos_veterinario WHERE deleted_at IS NULL ORDER BY random() LIMIT 1),
  (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
  1 + floor(random()*3)::int,
  (random()*15000 + 1000)::numeric(10,2),
  (ARRAY['pendiente','confirmado','cancelado'])[1 + floor(random()*3)::int]
FROM generate_series(1, 500)
WHERE EXISTS (SELECT 1 FROM productos_veterinario WHERE deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

-- Volumen bajo a propósito (naturaleza sensible del caso de uso) aunque el
-- resto del dataset escale a ~1000 dueños — ver docs/SEED.md, "Escala ciudad simulada".
INSERT INTO historiales_compartidos (mascota_id, veterinario_origen_id, veterinario_destino_id, revocado_en)
SELECT
  (SELECT id FROM mascotas WHERE deleted_at IS NULL ORDER BY random() LIMIT 1),
  v1.id, v2.id,
  CASE WHEN random() < 0.2 THEN now() - (random()*10 || ' days')::interval ELSE NULL END
FROM (SELECT id FROM usuarios WHERE rol_id = 2 AND deleted_at IS NULL ORDER BY random() LIMIT 20) v1,
     (SELECT id FROM usuarios WHERE rol_id = 2 AND deleted_at IS NULL ORDER BY random() LIMIT 20) v2
WHERE v1.id <> v2.id
LIMIT 40;

-- 4. Marketplace de comerciantes
CREATE TEMP TABLE tmp_comercios AS
WITH ins AS (
  INSERT INTO comercios (usuario_id, nombre_comercio, tipo_comercio, direccion, latitud, longitud, estado_verificacion)
  SELECT
    c.id,
    'Comercio ' || c.rn,
    (ARRAY['pet_shop','forrajeria','peluqueria','farmacia_veterinaria','otro'])[1 + floor(random()*5)::int],
    (ARRAY['San Martín','Rivadavia','Alsina','Avellaneda','Simón Bolívar','Belgrano','Moreno','Garay'])[1 + floor(random()*8)::int]
      || ' ' || (100 + floor(random()*900))::int || ', Coronel Pringles, Buenos Aires (B7530)',
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
FROM generate_series(1, 600);

-- 5. Foros y cursos — requiere dueños ya sembrados (seed-duenos.sql)
CREATE TEMP TABLE tmp_cursos AS
WITH ins AS (
  INSERT INTO cursos (publicado_por, titulo, descripcion, contenido_url)
  SELECT
    (SELECT id FROM tmp_organizaciones ORDER BY random() LIMIT 1),
    (ARRAY['Tenencia responsable básica','Primeros auxilios para mascotas','Nutrición canina y felina','Socialización de cachorros'])[1 + floor(random()*4)::int] || ' — Edición ' || gs,
    'Curso introductorio orientado a tutores de mascotas de la comunidad.',
    'https://cdn.patitasenalerta.test/cursos/seed-' || gs
  FROM generate_series(1, 60) AS gs
  RETURNING id
) SELECT id FROM ins;

-- Mismo criterio que las colaboraciones de más arriba: muestreo sin
-- reemplazo sobre el cross join de cursos x dueños (cada par existe una
-- única vez por construcción), para no violar ux_inscripcion_curso_usuario.
INSERT INTO inscripciones_curso (curso_id, usuario_id)
SELECT curso_id, usuario_id
FROM (
  SELECT c.id AS curso_id, d.id AS usuario_id
  FROM tmp_cursos c
  CROSS JOIN (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL) d
  ORDER BY random()
  LIMIT 3000
) muestra;

CREATE TEMP TABLE tmp_temas_foro AS
WITH ins AS (
  INSERT INTO temas_foro (creado_por, titulo, contenido)
  SELECT
    (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
    (ARRAY['¿Cómo sé si mi perro está bien de peso?','Recomendaciones para la primera visita al veterinario',
           '¿Cada cuánto desparasitar a un gato adulto?','Tips para adaptar a un rescatado al hogar'])[1 + floor(random()*4)::int] || ' #' || gs,
    'Consulta de la comunidad sobre bienestar y cuidado de mascotas.'
  FROM generate_series(1, 300) AS gs
  WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL)
  RETURNING id
) SELECT id FROM ins;

INSERT INTO respuestas_foro (tema_id, usuario_id, contenido)
SELECT
  (SELECT id FROM tmp_temas_foro ORDER BY random() LIMIT 1),
  (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
  'Respuesta de prueba con recomendación general de la comunidad.'
FROM generate_series(1, 2000)
WHERE EXISTS (SELECT 1 FROM tmp_temas_foro)
  AND EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

-- 6. Algoritmo de compatibilidad de adopción — requiere vitrina_adopcion ya
-- sembrada (seed-vitrina-adopcion.sql)
CREATE TEMP TABLE tmp_cuestionarios AS
WITH ins AS (
  INSERT INTO cuestionarios_adoptante (usuario_id, horas_solo_estimadas, presencia_ninos,
                                        espacio_disponible, experiencia_previa)
  SELECT
    (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
    floor(random()*10)::smallint,
    random() < 0.4,
    (ARRAY['departamento','casa_patio_pequeño','casa_patio_grande'])[1 + floor(random()*3)::int],
    'Tuvo mascotas anteriormente, experiencia básica en cuidados generales.'
  FROM generate_series(1, 300)
  WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL)
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
WHERE EXISTS (SELECT 1 FROM tmp_cuestionarios)
LIMIT 500;

COMMIT;
