-- Siembra de `reportes_historial_estado`: ~380 registros, 1 a 3 transiciones
-- por reporte, para poder probar el timeline de estado en la UI (Panel
-- municipal) sin depender de que cada reporte real haya pasado de verdad
-- por CambiarEstadoReporteCommand.
-- Adaptado del bloque "11. Historial de estado de reportes" de docs/SEED.md
-- — a diferencia del script maestro, este no depende de la tabla temporal
-- tmp_reportes: selecciona reportes al azar directo de la tabla real, así
-- se puede correr de forma independiente (siempre que ya existan reportes y
-- el usuario municipio — ver seed-reportes.sql y seed-municipio.sql).
--
-- Cada cadena de transiciones sigue el mismo camino lineal sin atajos que
-- valida CambiarEstadoReporteCommand vía ReporteEstado (State):
-- reportado → en_revision → en_atencion → resuelto → cerrado. Elegir una
-- longitud de 1 a 3 pasos por reporte alcanza ~380 registros en total sobre
-- los 220 reportes sembrados por seed-reportes.sql (promedio ~1.7 pasos por
-- reporte de los ~220 elegibles).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-municipio.sql  -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-reportes.sql   -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-historial-estado.sql

BEGIN;

WITH candidatos AS (
  SELECT id, created_at
  FROM reportes
  WHERE deleted_at IS NULL
  ORDER BY random()
  LIMIT 220
),
config AS (
  SELECT id AS reporte_id, created_at, 1 + floor(random() * 3)::int AS cantidad_pasos
  FROM candidatos
),
pasos AS (
  SELECT reporte_id, created_at, gs AS paso
  FROM config
  CROSS JOIN LATERAL generate_series(1, cantidad_pasos) AS gs
)
INSERT INTO reportes_historial_estado (reporte_id, estado_anterior, estado_nuevo, usuario_id, registrado_en)
SELECT
  p.reporte_id,
  (ARRAY['reportado', 'en_revision', 'en_atencion', 'resuelto'])[p.paso],
  (ARRAY['en_revision', 'en_atencion', 'resuelto', 'cerrado'])[p.paso],
  (SELECT id FROM usuarios WHERE rol_id = 3 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
  p.created_at + (p.paso || ' days')::interval
FROM pasos p
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 3 AND deleted_at IS NULL);

COMMIT;
