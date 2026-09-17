-- Índices únicos documentados en docs/SCHEMA.md pero nunca migrados — hoy la
-- unicidad se controla solo con un chequeo previo de aplicación (no
-- atómico), riesgo real de condición de carrera bajo concurrencia real,
-- a diferencia de `ux_inscripcion_curso_usuario` (Módulo 8), que sí está
-- migrada. `AutorizarVeterinario.persistir()` y
-- `OfrecerseComoColaboradorCommand.persistir()` se actualizan en el mismo
-- cambio para capturar la violación (P2002 de Prisma) como defensa final,
-- mismo criterio que `InscribirseCurso`/`GenerarPedidoCommand`.

-- Evita más de una autorización activa (revocada_en IS NULL) para el mismo
-- par mascota/veterinario — PEA-VET-009 (docs/ERRORS.md).
CREATE UNIQUE INDEX ux_autorizacion_activa
  ON autorizaciones_libreta (mascota_id, veterinario_id) WHERE revocada_en IS NULL;

-- Evita que el mismo stakeholder se ofrezca dos veces sobre la misma
-- solicitud — PEA-RED-002 (docs/ERRORS.md).
CREATE UNIQUE INDEX ux_colaboraciones_solicitud_stakeholder
  ON colaboraciones (solicitud_id, stakeholder_id) WHERE deleted_at IS NULL;
