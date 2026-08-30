-- Siembra del Módulo 2 (Motor de Reportes Unificado): 220 reportes para
-- poder probar paginación, filtros por tipo/estado y el mapa de calor antes
-- de ejercitar el alta manual (REP-01, CrearReporte).
-- Adaptado del bloque "reportes" de docs/SEED.md (mismo volumen, misma
-- distribución de tipo/estado y el mismo jitter geográfico alrededor de
-- Coronel Pringles) — a diferencia del script maestro, este no depende de
-- las tablas temporales tmp_dueños/tmp_mascotas: selecciona un dueño y,
-- cuando corresponde, una mascota al azar directo de las tablas reales, así
-- se puede correr de forma independiente (siempre que ya existan dueños y
-- mascotas — ver seed-duenos.sql y seed-mascotas.sql).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-duenos.sql    -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-mascotas.sql  -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-reportes.sql

BEGIN;

INSERT INTO reportes (tipo, subtipo, reportado_por, mascota_id, descripcion, foto_url,
                       latitud, longitud, estado, created_at)
SELECT
  t.tipo,
  CASE WHEN t.tipo = 'problematica'
       THEN (ARRAY['animal_suelto','foco_sanitario','accidente_vial'])[1 + floor(random() * 3)::int]
       ELSE NULL END,
  (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
  CASE WHEN t.tipo IN ('perdido', 'encontrado') AND random() < 0.6
       THEN (SELECT id FROM mascotas WHERE deleted_at IS NULL ORDER BY random() LIMIT 1)
       ELSE NULL END,
  CASE t.tipo
    WHEN 'perdido' THEN 'Se perdió cerca de la zona, responde a su nombre, muy sociable.'
    WHEN 'encontrado' THEN 'Encontrado deambulando solo, buen estado general, sin colisión visible.'
    ELSE 'Se observa animal suelto en la vía pública, posible riesgo para el tránsito.'
  END,
  'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/seed-' || gs || '.jpg',
  -37.9989 + (random() - 0.5) * 0.08,
  -61.3565 + (random() - 0.5) * 0.08,
  t.estado,
  now() - (random() * 56 || ' days')::interval
FROM generate_series(1, 220) AS gs
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['perdido', 'encontrado', 'problematica'])[1 + floor(random() * 3)::int] AS tipo,
    (ARRAY['reportado', 'en_revision', 'en_atencion', 'resuelto', 'cerrado'])[1 + floor(random() * 5)::int] AS estado
) t
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

-- Historial de transiciones (1 a 3 por reporte, docs/SEED.md): un renglón
-- 'reportado' → estado final para cada reporte que ya no está en 'reportado',
-- usando al propio reportante como autor del cambio para no depender de un
-- usuario con rol municipio/administrador ya sembrado.
INSERT INTO reportes_historial_estado (reporte_id, estado_anterior, estado_nuevo, usuario_id, registrado_en)
SELECT r.id, 'reportado', r.estado, r.reportado_por, r.created_at + interval '1 day'
FROM reportes r
WHERE r.estado <> 'reportado'
  AND r.created_at > now() - interval '56 days';

COMMIT;
