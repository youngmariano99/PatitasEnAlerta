/** Todos los estados válidos de una colaboración (docs/SCHEMA.md, CHECK estado sobre `colaboraciones`). */
export const ESTADOS_COLABORACION_SOPORTADOS = ['propuesta', 'aceptada', 'rechazada', 'completada'] as const;
export type EstadoColaboracion = (typeof ESTADOS_COLABORACION_SOPORTADOS)[number];
