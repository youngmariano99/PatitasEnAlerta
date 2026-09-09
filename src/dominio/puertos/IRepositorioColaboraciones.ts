/**
 * Proyección mínima de una colaboración vigente, suficiente para autorizar
 * (docs/ROLES.md, matriz Módulo 5: `organizacion` es la única con `U` sobre
 * `colaboraciones`, y solo sobre las asociadas a sus propias solicitudes;
 * `stakeholderId` es quien la propuso y también puede consultarla) y para
 * validar la transición de estado (ColaboracionEstado, patrón State).
 */
export interface ColaboracionActual {
  estado: string;
  /** organizacion_id de la `solicitud_recurso` asociada — dueña de la colaboración a efectos de autorización. */
  organizacionId: string;
  /** stakeholder_id (rescatista/veterinario) que propuso la colaboración. */
  stakeholderId: string;
}

/** Resultado de un cambio de estado exitoso — ver ActualizarEstadoColaboracionCommand.ts. */
export interface ColaboracionEstadoActualizado {
  id: string;
  estado: string;
  estadoAnterior: string;
}

/** Una fila de `colaboraciones_historial_estado` — ver ListarHistorialColaboracion.ts. */
export interface HistorialEstadoColaboracionItem {
  id: string;
  estadoAnterior: string;
  estadoNuevo: string;
  usuarioId: string;
  registradoEn: Date;
}

/**
 * Puerto hacia `colaboraciones` (Módulo 5 — Red de Colaboración, Post-MVP).
 * `ActualizarEstadoColaboracionCommand` y `ListarHistorialColaboracion`
 * dependen únicamente de esta abstracción, nunca de Prisma directamente —
 * mismo criterio que `IRepositorioReportes`. Alcance acotado a esta
 * actividad ("hilo de coordinación... con historial persistente"): el alta
 * de una colaboración (CR(p) de rescatista/veterinario, `docs/ROLES.md`)
 * queda para el ticket que implemente esa historia puntual.
 */
export interface IRepositorioColaboraciones {
  /** `null` si no existe o está soft-deleted. */
  obtenerActual(colaboracionId: string): Promise<ColaboracionActual | null>;
  /** UPDATE + INSERT en `colaboraciones_historial_estado` en una misma transacción (docs/SCHEMA.md). */
  actualizarEstado(colaboracionId: string, estadoNuevo: string, actualizadoPor: string): Promise<ColaboracionEstadoActualizado>;
  /** Historial completo de transiciones, ordenado cronológicamente por `registrado_en` (ascendente). */
  listarHistorialEstado(colaboracionId: string): Promise<HistorialEstadoColaboracionItem[]>;
}
