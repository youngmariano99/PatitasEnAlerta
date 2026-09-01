-- Siembra del dashboard analítico municipal (Módulo 3): refresca las
-- vistas materializadas (mv_metricas_reportes_periodo /
-- mv_metricas_turnos_periodo) sobre el dataset de reportes/turnos ya
-- sembrado, para poder probar el dashboard (KPIs + mapa de calor) con datos
-- reales sin esperar al primer ciclo del job asincrónico
-- (supabase/functions/refresh-metricas-dashboard/).
--
-- A diferencia del resto de scripts/seed/*.sql, este no INSERTa filas: las
-- vistas se pueblan solas a partir de `reportes`/`turnos` ya existentes —
-- por eso conviene correrlo DESPUÉS de sembrar esas dos tablas
-- (seed-reportes.sql, seed-turnos-municipio.sql), nunca antes.
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-reportes.sql            -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/seed-turnos-municipio.sql    -- si todavía no corrió
--   psql "$DATABASE_URL" -f scripts/seed/refresh-metricas-dashboard.sql

BEGIN;

-- REFRESH normal (no CONCURRENTLY): en un dataset recién sembrado esto es
-- más simple y no requiere que las vistas ya tengan datos previos para
-- diferenciar contra ellos — CONCURRENTLY (usado por el job real de
-- producción) es la forma correcta cuando el dashboard puede estar
-- sirviendo lecturas en simultáneo, algo que no aplica al sembrar datos de
-- desarrollo/QA de una sola vez.
REFRESH MATERIALIZED VIEW mv_metricas_reportes_periodo;
REFRESH MATERIALIZED VIEW mv_metricas_turnos_periodo;

COMMIT;
