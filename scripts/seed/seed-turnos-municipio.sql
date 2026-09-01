-- Siembra del Módulo 3 (Motor de Turnera compartido, `proveedor_tipo =
-- 'municipio'`): 10 franjas por evento ya sembrado, mezclando
-- disponible/reservado/cancelado, para poblar la turnera antes de probar
-- reservas y ejercitar paginación/límites del frontend con volumen real.
-- Adaptado del bloque "15. Turnos (motor compartido municipio +
-- veterinario)" de docs/SEED.md (mismo criterio de 10 franjas secuenciales
-- de 20 minutos por evento, arrancando en `eventos.fecha`) — a diferencia
-- del script maestro, este no depende de las tablas temporales
-- tmp_eventos/tmp_municipio: selecciona directo de las tablas reales, así
-- se puede correr de forma independiente (siempre que ya existan eventos —
-- ver seed-eventos.sql).
--
-- Alcance: solo `proveedor_tipo='municipio'` (lo que corresponde a esta
-- actividad, GenerarTurnosEvento). El volumen total de `turnos` documentado
-- en docs/SEED.md (260) incluye además la mitad `veterinario`, que sembrará
-- su propio script cuando se implemente el Módulo 4 — este script aporta
-- los 150 registros municipales (15 eventos × 10 franjas).
--
-- Nota: 10 franjas por evento es un valor fijo de siembra (igual al bloque
-- histórico de docs/SEED.md), independiente de `cupos_totales` real de cada
-- evento (que en producción sí determina la cantidad exacta vía
-- GenerarTurnosEvento.ts) — acá el objetivo es volumen de prueba para la
-- UI, no reproducir la regla de negocio evento por evento.
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-eventos.sql  -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-turnos-municipio.sql

BEGIN;

INSERT INTO turnos (proveedor_tipo, proveedor_id, evento_id, reservado_por, franja_inicio, franja_fin, estado)
SELECT
  'municipio',
  e.municipio_id,
  e.id,
  CASE WHEN random() < 0.6 THEN (SELECT id FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL ORDER BY random() LIMIT 1) ELSE NULL END,
  ts.inicio,
  ts.inicio + interval '20 minutes',
  CASE WHEN random() < 0.6 THEN 'reservado' WHEN random() < 0.9 THEN 'disponible' ELSE 'cancelado' END
FROM eventos e
CROSS JOIN LATERAL (
  SELECT e.fecha + (s * interval '20 minutes') AS inicio
  FROM generate_series(0, 9) AS s
) ts
WHERE e.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM usuarios WHERE rol_id = 1 AND deleted_at IS NULL);

COMMIT;
