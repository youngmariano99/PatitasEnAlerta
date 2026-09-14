import type { SolicitudRecurso } from '@dominio/entidades/SolicitudRecurso';

export interface DatosNuevaSolicitudRecurso {
  organizacionId: string;
  tipo: string;
  descripcion: string;
  /** Reporte comunitario del que se origina la solicitud (Módulo 2), si aplica — `null` si es independiente. */
  reporteId: string | null;
}

/**
 * Proyección mínima de una solicitud vigente, suficiente para autorizar el
 * ofrecimiento de un colaborador (docs/ERRORS.md PEA-RED-001/003): que
 * exista y que siga `abierta`. Mismo criterio de "proyección mínima para
 * autorizar" que `ColaboracionActual` en IRepositorioColaboraciones.ts.
 */
export interface SolicitudActual {
  estado: string;
  /** organizacion_id dueña de la solicitud — a quién notificar ante un nuevo ofrecimiento. */
  organizacionId: string;
}

/**
 * Puerto hacia `solicitudes_recurso` (Módulo 5 — Red de Colaboración,
 * Post-MVP). `PublicarSolicitudRecurso.ts` y `OfrecerseComoColaboradorCommand.ts`
 * dependen únicamente de esta abstracción, nunca de Prisma directamente
 * (mismo criterio que IRepositorioEventos). Alcance acotado a lo que esas
 * historias necesitan: alta, y lectura mínima de una solicitud puntual. El
 * resto del CRUD descrito en docs/ROLES.md (`organizacion CRUD(p)`) —
 * listado propio, edición, baja — queda para los tickets que implementen
 * esas historias puntuales, mismo criterio de entrega incremental que
 * autorizaciones_libreta.
 */
export interface IRepositorioSolicitudesRecurso {
  crear(datos: DatosNuevaSolicitudRecurso): Promise<SolicitudRecurso>;
  /** `null` si no existe o está soft-deleted (PEA-RED-003). */
  obtenerActual(solicitudId: string): Promise<SolicitudActual | null>;
}
