import type { SolicitudRecurso } from '@dominio/entidades/SolicitudRecurso';
import type { FiltroZona } from '@dominio/puertos/IRepositorioReportes';

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

/** Una fila del listado de solicitudes de asistencia veterinaria — ver ListarSolicitudesVeterinarias.ts. */
export interface SolicitudListada {
  id: string;
  organizacionId: string;
  tipo: string;
  descripcion: string;
  reporteId: string | null;
  estado: string;
  createdAt: Date;
}

export interface PaginaSolicitudesVeterinarias {
  items: SolicitudListada[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Puerto hacia `solicitudes_recurso` (Módulo 5 — Red de Colaboración,
 * Post-MVP). `PublicarSolicitudRecurso.ts`, `OfrecerseComoColaboradorCommand.ts`
 * y `ListarSolicitudesVeterinarias.ts` dependen únicamente de esta
 * abstracción, nunca de Prisma directamente (mismo criterio que
 * IRepositorioEventos). Alcance acotado a lo que esas historias necesitan:
 * alta, lectura mínima de una solicitud puntual, y el listado filtrado de
 * asistencia veterinaria. El resto del CRUD descrito en docs/ROLES.md
 * (`organizacion CRUD(p)`) — listado propio general, edición, baja — queda
 * para los tickets que implementen esas historias puntuales, mismo criterio
 * de entrega incremental que autorizaciones_libreta.
 */
export interface IRepositorioSolicitudesRecurso {
  crear(datos: DatosNuevaSolicitudRecurso): Promise<SolicitudRecurso>;
  /** `null` si no existe o está soft-deleted (PEA-RED-003). */
  obtenerActual(solicitudId: string): Promise<SolicitudActual | null>;
  /**
   * Solicitudes con `tipo='asistencia_veterinaria' AND estado='abierta'`,
   * paginadas (server-side) y opcionalmente filtradas por la zona de la
   * organización dueña (`zona` es todo-o-nada, igual que
   * `ListarDirectorioAliados`/`ListarReportes` — se resuelve vía las
   * columnas `usuarios.latitud`/`longitud`, `solicitudes_recurso` no tiene
   * columna de ubicación propia).
   */
  listarAsistenciaVeterinariaAbiertas(
    zona: FiltroZona | undefined,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaSolicitudesVeterinarias>;
  /** Todas las solicitudes `estado='abierta'` (cualquier tipo), paginadas — para que rescatistas/veterinarios naveguen el listado completo y se ofrezcan como colaboradores. */
  listarAbiertas(pagina: number, porPagina: number): Promise<PaginaSolicitudesVeterinarias>;
}
