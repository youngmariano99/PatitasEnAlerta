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

export interface DatosNuevaColaboracion {
  solicitudId: string;
  stakeholderId: string;
}

/** Resultado de un ofrecimiento exitoso — ver OfrecerseComoColaboradorCommand.ts. */
export interface ColaboracionPropuesta {
  id: string;
  solicitudId: string;
  stakeholderId: string;
  /** organizacion_id dueña de la solicitud asociada — a quién se notifica el ofrecimiento. */
  organizacionId: string;
  estado: string;
  createdAt: Date;
}

/**
 * Métricas agregadas de las colaboraciones completadas de UN stakeholder
 * puntual — ver ObtenerMetricasPropias.ts. `porTipo` desglosa por
 * `solicitudes_recurso.tipo` (docs/SCHEMA.md: 'transito'|'insumos'|
 * 'asistencia_veterinaria'|'adopcion'). Deliberadamente sin ningún campo
 * comparativo entre usuarios (ranking, promedio general, percentil) —
 * docs/REQUISITOS.md: "sin exposición pública comparativa frente a otros
 * usuarios".
 */
export interface MetricasColaboracionPropias {
  totalCompletadas: number;
  porTipo: Record<string, number>;
}

/**
 * Puerto hacia `colaboraciones` (Módulo 5 — Red de Colaboración, Post-MVP).
 * `ActualizarEstadoColaboracionCommand`, `ListarHistorialColaboracion`,
 * `OfrecerseComoColaboradorCommand` y `ObtenerMetricasPropias` dependen
 * únicamente de esta abstracción, nunca de Prisma directamente — mismo
 * criterio que `IRepositorioReportes`.
 */
export interface IRepositorioColaboraciones {
  /** `null` si no existe o está soft-deleted. */
  obtenerActual(colaboracionId: string): Promise<ColaboracionActual | null>;
  /** UPDATE + INSERT en `colaboraciones_historial_estado` en una misma transacción (docs/SCHEMA.md). */
  actualizarEstado(colaboracionId: string, estadoNuevo: string, actualizadoPor: string): Promise<ColaboracionEstadoActualizado>;
  /** Historial completo de transiciones, ordenado cronológicamente por `registrado_en` (ascendente). */
  listarHistorialEstado(colaboracionId: string): Promise<HistorialEstadoColaboracionItem[]>;
  /**
   * true si ya existe una colaboración no soft-deleted del mismo
   * `stakeholderId` sobre la misma `solicitudId` (docs/ERRORS.md
   * PEA-RED-002) — chequeo de aplicación previo al INSERT, mismo criterio
   * que `IRepositorioAutorizacionesLibreta.obtenerActual` en
   * `AutorizarVeterinario.ts` (PEA-VET-009): la unicidad real queda
   * documentada como índice único en docs/SCHEMA.md, no forzada todavía a
   * nivel de base de datos.
   */
  existePropuestaDe(solicitudId: string, stakeholderId: string): Promise<boolean>;
  /** INSERT en `colaboraciones` con estado inicial 'propuesta'. */
  crear(datos: DatosNuevaColaboracion): Promise<ColaboracionPropuesta>;
  /**
   * Agrega SIEMPRE filtrado por `stakeholder_id = stakeholderId` — nunca
   * expone filas de otro usuario (verificación técnica del ticket "Métricas
   * personales de contribución"). Solo colaboraciones no soft-deleted con
   * `estado = 'completada'`.
   */
  obtenerMetricasPropias(stakeholderId: string): Promise<MetricasColaboracionPropias>;
}
