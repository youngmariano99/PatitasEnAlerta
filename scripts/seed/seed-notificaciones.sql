-- Siembra de `notificaciones`: 300 registros con mezcla leído/no leído,
-- para poder probar el badge de notificaciones (paginación, contador de no
-- leídas) sin depender de que se hayan generado coincidencias reales vía
-- DetectarCoincidenciaReporteJob.
-- Adaptado del bloque "12. Notificaciones" de docs/SEED.md (mismo volumen,
-- misma mezcla 50/50 leído/no leído) — a diferencia del script maestro, este
-- no depende de las tablas temporales tmp_dueños/tmp_reportes: selecciona un
-- dueño y un reporte al azar directo de las tablas reales, así se puede
-- correr de forma independiente (siempre que ya existan dueños y reportes —
-- ver seed-duenos.sql y seed-reportes.sql).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-duenos.sql    -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-reportes.sql  -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-notificaciones.sql

BEGIN;

INSERT INTO notificaciones (usuario_id, tipo, referencia_tabla, referencia_id, leido, created_at)
SELECT
  (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
  'reporte_coincidente',
  'reportes',
  (SELECT id FROM reportes ORDER BY random() LIMIT 1),
  random() < 0.5,
  now() - (random() * 30 || ' days')::interval
FROM generate_series(1, 300)
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM reportes);

COMMIT;
