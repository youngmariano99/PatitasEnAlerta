-- Siembra del Módulo 2 (Motor de Reportes Unificado): 220 reportes para
-- poder probar paginación, filtros por tipo/estado y el mapa de calor antes
-- de ejercitar el alta manual (REP-01/REP-02/REP-03, CrearReporte).
-- Los reportes 'problematica' ya distribuían sus 3 subtipos al azar
-- (animal_suelto/foco_sanitario/accidente_vial) desde el bloque original —
-- verificado como parte de esta actividad, sin cambios necesarios acá.
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

-- 218 reportes aleatorios + 2 garantizados (bloque siguiente) = 220 en total.
INSERT INTO reportes (tipo, subtipo, reportado_por, mascota_id, descripcion, foto_url,
                       latitud, longitud, especie, estado, created_at)
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
  -- 10% sin especie declarada (texto libre, mismo criterio que un reporte
  -- real donde el vecino no la completó) — EvaluarCoincidenciaReporte omite
  -- la búsqueda de coincidencias para esos casos, ver ERRORS.md.
  CASE WHEN t.tipo IN ('perdido', 'encontrado') AND random() < 0.9
       THEN (ARRAY['perro', 'gato'])[1 + floor(random() * 2)::int]
       ELSE NULL END,
  t.estado,
  now() - (random() * 56 || ' days')::interval
FROM generate_series(1, 218) AS gs
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['perdido', 'encontrado', 'problematica'])[1 + floor(random() * 3)::int] AS tipo,
    (ARRAY['reportado', 'en_revision', 'en_atencion', 'resuelto', 'cerrado'])[1 + floor(random() * 5)::int] AS estado
) t
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

-- Par garantizado 'perdido' ↔ 'encontrado' coincidente en zona (a ~100m,
-- muy por debajo del radio de 5km de EvaluarCoincidenciaReporte) y especie
-- ('perro'), ambos activos ('reportado') — para poder demostrar/probar la
-- notificación reporte_coincidente sin depender del azar del bloque anterior.
INSERT INTO reportes (tipo, subtipo, reportado_por, mascota_id, descripcion, foto_url,
                       latitud, longitud, especie, estado, created_at)
SELECT 'perdido', NULL,
       (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
       NULL, 'Mi perro Toby se perdió cerca de la plaza central, es muy sociable.',
       'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/seed-match-perdido.jpg',
       -37.9989, -61.3565, 'perro', 'reportado', now() - interval '2 days'
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

INSERT INTO reportes (tipo, subtipo, reportado_por, mascota_id, descripcion, foto_url,
                       latitud, longitud, especie, estado, created_at)
SELECT 'encontrado', NULL,
       (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1),
       NULL, 'Encontré un perro suelto cerca de la plaza central, parece perdido.',
       'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/seed-match-encontrado.jpg',
       -37.9995, -61.3560, 'perro', 'reportado', now() - interval '1 day'
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

-- Historial de transiciones (1 a 3 por reporte, docs/SEED.md), siguiendo el
-- mismo camino lineal sin atajos que valida CambiarEstadoReporteCommand vía
-- ReporteEstado (State): reportado → en_revision → en_atencion → resuelto →
-- cerrado. Usa al propio reportante como autor del cambio para no depender
-- de un usuario con rol municipio/administrador ya sembrado. El par
-- garantizado de arriba queda deliberadamente en 'reportado' (activo) y no
-- genera historial.
WITH config AS (
  SELECT id AS reporte_id, reportado_por, created_at AS base,
         1 + floor(random() * 3)::int AS cantidad_pasos
  FROM reportes
  WHERE estado <> 'reportado'
    AND created_at > now() - interval '56 days'
),
pasos AS (
  SELECT reporte_id, reportado_por, base, gs AS paso
  FROM config
  CROSS JOIN LATERAL generate_series(1, cantidad_pasos) AS gs
)
INSERT INTO reportes_historial_estado (reporte_id, estado_anterior, estado_nuevo, usuario_id, registrado_en)
SELECT
  p.reporte_id,
  (ARRAY['reportado', 'en_revision', 'en_atencion', 'resuelto'])[p.paso],
  (ARRAY['en_revision', 'en_atencion', 'resuelto', 'cerrado'])[p.paso],
  p.reportado_por,
  p.base + (p.paso || ' days')::interval
FROM pasos p;

COMMIT;
