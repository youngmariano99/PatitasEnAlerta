export interface DatosReporte {
  tipo: string;
  subtipo: string | null;
  reportadoPor: string;
  mascotaId: string | null;
  descripcion: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  estado: string;
}

/**
 * Entidad de dominio Reporte. Representa siempre un reporte ya persistido
 * (con `id` y `createdAt`) — el alta se modela con `DatosReporte` (sin id)
 * en el puerto del repositorio, mismo criterio que Mascota.ts.
 */
export class Reporte {
  private constructor(
    public readonly id: string,
    public readonly tipo: string,
    public readonly subtipo: string | null,
    public readonly reportadoPor: string,
    public readonly mascotaId: string | null,
    public readonly descripcion: string,
    public readonly fotoUrl: string,
    public readonly latitud: number,
    public readonly longitud: number,
    public readonly estado: string,
    public readonly createdAt: Date,
  ) {}

  static reconstruir(id: string, datos: DatosReporte, createdAt: Date): Reporte {
    return new Reporte(
      id,
      datos.tipo,
      datos.subtipo,
      datos.reportadoPor,
      datos.mascotaId,
      datos.descripcion,
      datos.fotoUrl,
      datos.latitud,
      datos.longitud,
      datos.estado,
      createdAt,
    );
  }
}
