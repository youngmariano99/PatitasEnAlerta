-- Siembra del Módulo 3 (Vitrina de Adopción institucional): 60 fichas,
-- mezcla de estados (disponible/adoptado/baja), para probar paginación y
-- filtros del panel municipal (app/municipio/adopciones/page.tsx) antes de
-- ejercitar el alta manual (PublicarFichaAdopcion).
-- Adaptado del bloque "16. Vitrina de adopción" de docs/SEED.md (mismo
-- volumen, misma mezcla de especie/tamaño/temperamento/estado) — a
-- diferencia del script maestro, este no depende de la tabla temporal
-- tmp_municipio: selecciona la cuenta municipal única (single-tenant,
-- docs/SCHEMA.md) directo de `usuarios`, así se puede correr de forma
-- independiente (siempre que ya exista — ver seed-municipio.sql).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-municipio.sql       -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-vitrina-adopcion.sql

BEGIN;

INSERT INTO vitrina_adopcion (municipio_id, nombre_animal, especie, edad_aproximada, tamano,
                               temperamento, estado_salud, requisitos_adopcion, foto_url, estado)
SELECT
  (SELECT id FROM usuarios WHERE rol_id = 3 AND deleted_at IS NULL LIMIT 1),
  (ARRAY['Toby', 'Luna', 'Rocky', 'Nina', 'Max', 'Bella', 'Simba', 'Michi', 'Kiara', 'Coco'])[1 + floor(random() * 10)::int] || ' ' || gs,
  (ARRAY['perro', 'gato'])[1 + floor(random() * 2)::int],
  floor(random() * 10)::smallint,
  (ARRAY['pequeño', 'mediano', 'grande'])[1 + floor(random() * 3)::int],
  (ARRAY['Sociable', 'Tranquilo', 'Juguetón', 'Tímido al principio, luego cariñoso'])[1 + floor(random() * 4)::int],
  (ARRAY['Sano, castrado y vacunado', 'En recuperación, vacunas al día', 'Sano, pendiente castración'])[1 + floor(random() * 3)::int],
  'Adoptante mayor de 18 años, se realiza visita previa a la vivienda.',
  'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/seed-' || gs || '.jpg',
  -- Mezcla deliberada, con sesgo hacia 'disponible' (3 de 5 combinaciones):
  -- una vitrina pública real tiene más fichas activas que dadas de baja o
  -- ya adoptadas, pero ambos casos tienen que existir para probar el filtro
  -- por estado del panel.
  (ARRAY['disponible', 'disponible', 'disponible', 'adoptado', 'baja'])[1 + floor(random() * 5)::int]
FROM generate_series(1, 60) AS gs
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 3 AND deleted_at IS NULL);

COMMIT;
