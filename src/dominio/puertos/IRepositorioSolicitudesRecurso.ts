import type { SolicitudRecurso } from '@dominio/entidades/SolicitudRecurso';

export interface DatosNuevaSolicitudRecurso {
  organizacionId: string;
  tipo: string;
  descripcion: string;
  /** Reporte comunitario del que se origina la solicitud (Módulo 2), si aplica — `null` si es independiente. */
  reporteId: string | null;
}

/**
 * Puerto hacia `solicitudes_recurso` (Módulo 5 — Red de Colaboración,
 * Post-MVP). `PublicarSolicitudRecurso.ts` depende únicamente de esta
 * abstracción, nunca de Prisma directamente (mismo criterio que
 * IRepositorioEventos). Alcance acotado a esta actividad: solo el alta
 * ("Publicar solicitudes de recurso", docs/REQUISITOS.md Módulo 5). El resto
 * del CRUD descrito en docs/ROLES.md (`organizacion CRUD(p)`) — listado,
 * edición, baja — queda para los tickets que implementen esas historias,
 * mismo criterio de entrega incremental que autorizaciones_libreta.
 */
export interface IRepositorioSolicitudesRecurso {
  crear(datos: DatosNuevaSolicitudRecurso): Promise<SolicitudRecurso>;
}
