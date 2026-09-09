-- El directorio de aliados verificados (Módulo 5 — Red de Colaboración,
-- Post-MVP, docs/REQUISITOS.md línea 85) pide poder filtrar "por zona", pero
-- ninguna fila de `usuarios` tenía hasta ahora una ubicación propia (solo
-- `reportes`/`eventos`/`comercios` la tienen). Se agrega nullable y sin
-- backfill -- dato opcional que ningún alta de rol pide hoy, distinto de
-- exigirlo retroactivamente a usuarios ya registrados -- ver
-- docs/DECISIONES.md para el detalle de esta decisión.

ALTER TABLE "usuarios" ADD COLUMN "latitud" DOUBLE PRECISION;
ALTER TABLE "usuarios" ADD COLUMN "longitud" DOUBLE PRECISION;

-- Sostiene el filtro de zona (bounding box) de ListarDirectorioAliados sin
-- escanear la tabla completa de usuarios.
CREATE INDEX "usuarios_latitud_longitud_idx" ON "usuarios"("latitud", "longitud");
