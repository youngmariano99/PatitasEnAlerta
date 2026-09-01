-- Siembra del Módulo 3 (Municipio: Eventos, Turnera y Vitrina de Adopción):
-- 15 operativos municipales, mezclando pasados y futuros, para poblar el
-- calendario público antes de probar el alta rápida (CrearEvento) y para
-- ejercitar paginación/límites del frontend con volumen real.
-- Adaptado del bloque "13. Eventos municipales" de docs/SEED.md (mismo
-- volumen, misma distribución de tipo y el mismo jitter geográfico
-- alrededor de Coronel Pringles) — a diferencia del script maestro, este no
-- depende de la tabla temporal tmp_municipio: selecciona la cuenta
-- municipal única (single-tenant, docs/SCHEMA.md) directo de `usuarios`, así
-- se puede correr de forma independiente (siempre que ya exista —
-- ver seed-municipio.sql).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-municipio.sql  -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-eventos.sql

BEGIN;

INSERT INTO eventos (municipio_id, titulo, tipo, direccion, latitud, longitud, fecha, cupos_totales, requisitos)
SELECT
  (SELECT id FROM usuarios WHERE rol_id = 3 AND deleted_at IS NULL LIMIT 1),
  'Jornada de ' || et.tipo || ' — Barrio ' || (ARRAY['Norte', 'Sur', 'Centro', 'Estación', 'Villa Iris'])[1 + floor(random() * 5)::int],
  et.tipo,
  'Calle ' || (10 + floor(random() * 90))::int || ' N° ' || (100 + floor(random() * 900))::int,
  -37.9989 + (random() - 0.5) * 0.06,
  -61.3565 + (random() - 0.5) * 0.06,
  -- Rango [-20, +40] días: mezcla deliberada de operativos pasados (para
  -- probar el historial/filtro del calendario) y futuros (para el alta
  -- rápida y la reserva de turnos), nunca solo uno de los dos extremos.
  now() + (random() * 60 - 20 || ' days')::interval,
  (ARRAY[20, 30, 40, 50])[1 + floor(random() * 4)::int],
  'Traer a la mascota con collar/bozal y DNI del tutor.'
FROM generate_series(1, 15) AS gs
CROSS JOIN LATERAL (
  SELECT (ARRAY['castracion', 'vacunacion', 'desparasitacion'])[1 + floor(random() * 3)::int] AS tipo
) et
WHERE EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 3 AND deleted_at IS NULL);

COMMIT;
