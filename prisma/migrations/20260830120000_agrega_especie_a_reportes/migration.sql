-- Agrega `especie` a `reportes` para soportar la coincidencia zona+especie
-- entre reportes 'perdido' y 'encontrado' (REP-U-06, docs/PLANIFICACION.md,
-- docs/REQUISITOS.md) — ver EvaluarCoincidenciaReporte.ts. Nullable y sin
-- backfill: el dato no existía antes de esta actividad y no hay forma
-- confiable de derivarlo retroactivamente para los reportes ya persistidos
-- que no están vinculados a una mascota registrada (mascota_id opcional).

ALTER TABLE "reportes" ADD COLUMN "especie" TEXT;

-- Reemplaza el índice (tipo, estado) por (tipo, estado, especie): toda
-- consulta de coincidencias filtra exactamente por esos tres campos antes
-- de aplicar el rango geográfico.
DROP INDEX IF EXISTS "reportes_tipo_estado_idx";
CREATE INDEX "reportes_tipo_estado_especie_idx" ON "reportes"("tipo", "estado", "especie");
