-- Hilo de coordinación con historial persistente (Módulo 5 — Red de
-- Colaboración, Post-MVP, docs/REQUISITOS.md: "Coordinar el seguimiento de
-- una colaboración aceptada en un hilo dedicado, con historial persistente").
-- Mismo diseño que `reportes_historial_estado` (Módulo 2): tabla INSERT-only,
-- una fila por transición de estado, escrita por
-- ActualizarEstadoColaboracionCommand.ts en la misma transacción que el
-- UPDATE de `colaboraciones.estado` (ver PrismaColaboracionesRepositorio.ts).

-- CreateTable
CREATE TABLE "colaboraciones_historial_estado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "colaboracion_id" UUID NOT NULL,
    "estado_anterior" TEXT NOT NULL,
    "estado_nuevo" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "registrado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "colaboraciones_historial_estado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "colaboraciones_historial_estado_colaboracion_id_idx" ON "colaboraciones_historial_estado"("colaboracion_id");

-- AddForeignKey
ALTER TABLE "colaboraciones_historial_estado" ADD CONSTRAINT "colaboraciones_historial_estado_colaboracion_id_fkey" FOREIGN KEY ("colaboracion_id") REFERENCES "colaboraciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colaboraciones_historial_estado" ADD CONSTRAINT "colaboraciones_historial_estado_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
