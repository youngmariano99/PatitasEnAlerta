-- Dashboard analítico municipal (Módulo 3) — vistas materializadas + función
-- de refresco. Transcripción textual de docs/SCHEMA.md, sección "Vistas
-- materializadas — Dashboard Municipal" — única fuente de verdad. No
-- modificar acá sin actualizar primero ese documento.
--
-- Prisma no expresa `CREATE MATERIALIZED VIEW` de forma nativa (SETUP.md,
-- Paso 6) — por eso esta migración es 100% SQL manual, igual que los CHECK
-- constraints y las políticas RLS de migraciones anteriores. Los modelos
-- Prisma `MetricaReportePeriodo`/`MetricaTurnoPeriodo` (schema.prisma) leen
-- estas vistas como si fueran tablas de solo lectura.

-- `zona_lat`/`zona_lng`: lat/long redondeadas a 2 decimales (~1.1km de lado
-- a esta latitud) — la grilla que alimenta el filtro por zona y el mapa de
-- calor del dashboard (MUN-04), sin la cual DashboardMunicipalBuilder no
-- tendría ninguna dimensión geográfica para agrupar sin volver a consultar
-- `reportes` en vivo.
CREATE MATERIALIZED VIEW mv_metricas_reportes_periodo AS
SELECT
  date_trunc('week', created_at) AS periodo,
  tipo,
  estado,
  round(latitud::numeric, 2) AS zona_lat,
  round(longitud::numeric, 2) AS zona_lng,
  count(*)::integer AS total
FROM reportes
WHERE deleted_at IS NULL
GROUP BY periodo, tipo, estado, zona_lat, zona_lng;

CREATE UNIQUE INDEX ux_mv_metricas_reportes_periodo
  ON mv_metricas_reportes_periodo (periodo, tipo, estado, zona_lat, zona_lng);

CREATE MATERIALIZED VIEW mv_metricas_turnos_periodo AS
SELECT date_trunc('week', franja_inicio) AS periodo, proveedor_tipo, estado, count(*)::integer AS total
FROM turnos
WHERE deleted_at IS NULL
GROUP BY periodo, proveedor_tipo, estado;

CREATE UNIQUE INDEX ux_mv_metricas_turnos_periodo
  ON mv_metricas_turnos_periodo (periodo, proveedor_tipo, estado);

-- Los índices UNIQUE de arriba son obligatorios para poder usar
-- `REFRESH MATERIALIZED VIEW CONCURRENTLY` (Postgres lo exige) — sin ellos,
-- ese REFRESH tomaría un lock exclusivo y bloquearía las lecturas del
-- dashboard mientras corre, exactamente lo que el Paso 2 del ticket pide
-- evitar.

-- Refrescada por supabase/functions/refresh-metricas-dashboard/ (Edge
-- Function programada por Cron), NUNCA en el request del dashboard (Paso 2).
-- La Edge Function invoca esta función vía RPC (`supabase.rpc(...)`) en vez
-- de ejecutar SQL suelto, para no necesitar una conexión Postgres directa
-- desde Deno — solo el cliente supabase-js con la service role key.
CREATE OR REPLACE FUNCTION refrescar_metricas_dashboard() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_metricas_reportes_periodo;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_metricas_turnos_periodo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
