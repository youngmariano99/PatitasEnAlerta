-- Siembra acotada al Módulo 1 (AUTH-04): 180 mascotas repartidas entre
-- dueños existentes, para poder probar el listado /mascotas (paginación,
-- filtros) antes de ejercitar el alta manual.
-- Adaptado del bloque "9. Mascotas" de docs/SEED.md (mismos arrays de
-- nombres/especies/razas) — a diferencia del script maestro, este no
-- depende de la tabla temporal tmp_dueños: selecciona un dueño al azar
-- directo de `usuarios`, así se puede correr de forma independiente
-- (siempre que ya existan dueños — ver scripts/seed/seed-duenos.sql).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-duenos.sql   -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-mascotas.sql

BEGIN;

INSERT INTO mascotas (dueño_id, nombre, especie, raza, edad_aproximada, foto_url, identificacion_chip)
SELECT
  (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
  (ARRAY['Toby','Luna','Rocky','Nina','Max','Bella','Simba','Michi','Firulais','Kiara','Thor','Coco','Duke','Mia','Rex'])[1 + floor(random()*15)::int],
  (ARRAY['perro','gato'])[1 + floor(random()*2)::int],
  (ARRAY['Mestizo','Labrador','Caniche','Siamés','Ovejero Alemán','Común Europeo','Bulldog','Fox Terrier'])[1 + floor(random()*8)::int],
  floor(random()*14)::smallint,
  'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/seed-' || gs || '.jpg',
  CASE WHEN random() < 0.3 THEN lpad((900000000 + gs)::text, 15, '0') ELSE NULL END
FROM generate_series(1, 180) AS gs
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

COMMIT;
