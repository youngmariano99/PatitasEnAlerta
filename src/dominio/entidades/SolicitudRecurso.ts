export interface DatosSolicitudRecurso {
  organizacionId: string;
  tipo: string;
  descripcion: string;
  reporteId: string | null;
  estado: string;
}

/**
 * Entidad de dominio SolicitudRecurso (Red de Colaboración, Módulo 5 —
 * Post-MVP). Representa siempre una solicitud ya persistida (con `id` y
 * `createdAt`) — el alta se modela con `DatosSolicitudRecurso` (sin id) en
 * el puerto del repositorio, mismo criterio que Evento.ts/Reporte.ts.
 */
export class SolicitudRecurso {
  private constructor(
    public readonly id: string,
    public readonly organizacionId: string,
    public readonly tipo: string,
    public readonly descripcion: string,
    public readonly reporteId: string | null,
    public readonly estado: string,
    public readonly createdAt: Date,
  ) {}

  static reconstruir(id: string, datos: DatosSolicitudRecurso, createdAt: Date): SolicitudRecurso {
    return new SolicitudRecurso(
      id,
      datos.organizacionId,
      datos.tipo,
      datos.descripcion,
      datos.reporteId,
      datos.estado,
      createdAt,
    );
  }
}
