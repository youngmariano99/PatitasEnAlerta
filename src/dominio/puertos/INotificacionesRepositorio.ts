export interface DatosNotificacion {
  usuarioId: string;
  /** docs/SCHEMA.md: CHECK (tipo IN ('reporte_coincidente','turno_confirmado','turno_cancelado','verificacion_resuelta')). */
  tipo: string;
  referenciaTabla: string;
  referenciaId: string;
}

/** Puerto del listener de notificaciones (Observer, PLANIFICACION.md Sección 4.2). */
export interface INotificacionesRepositorio {
  crear(datos: DatosNotificacion): Promise<void>;
}
