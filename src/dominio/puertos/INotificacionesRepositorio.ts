export interface DatosNotificacion {
  usuarioId: string;
  /** docs/SCHEMA.md: CHECK (tipo IN ('reporte_coincidente','turno_confirmado','turno_cancelado','verificacion_resuelta')). */
  tipo: string;
  referenciaTabla: string;
  referenciaId: string;
}

export interface NotificacionListada {
  id: string;
  tipo: string;
  referenciaTabla: string;
  referenciaId: string;
  leido: boolean;
  createdAt: Date;
}

export interface PaginaNotificaciones {
  items: NotificacionListada[];
  total: number;
  pagina: number;
  porPagina: number;
  /** Cantidad de no leídas del usuario en TODA su bandeja, no solo la página actual — para el badge de la campana. */
  noLeidas: number;
}

/** Puerto del listener de notificaciones (Observer, PLANIFICACION.md Sección 4.2). */
export interface INotificacionesRepositorio {
  crear(datos: DatosNotificacion): Promise<void>;
  /** Bandeja propia, más recientes primero (docs/ROLES.md 3.7: solo lectura filtrada por usuario_id propio). */
  listarPorUsuario(usuarioId: string, pagina: number, porPagina: number): Promise<PaginaNotificaciones>;
  /**
   * Marca como leída SOLO si `id` le pertenece a `usuarioId` — UPDATE
   * atómico con ambas condiciones en el WHERE (nunca "buscar y después
   * actualizar": evita una carrera entre verificar pertenencia y escribir).
   * Devuelve `false` si no existe o no es del usuario — el caso de uso
   * colapsa ambos casos en el mismo error anti-enumeración (mismo criterio
   * que RepositorioProxy).
   */
  marcarComoLeida(id: string, usuarioId: string): Promise<boolean>;
}
