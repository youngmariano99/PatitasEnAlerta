export interface DatosReporte {
  tipo: string;
  subtipo: string | null;
  reportadoPor: string;
  mascotaId: string | null;
  descripcion: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  especie: string | null;
  estado: string;
}

/**
 * Estados de un reporte que todavía representan un caso abierto (docs/SCHEMA.md,
 * CHECK estado). Único criterio de "activo" reutilizado tanto por
 * EvaluarCoincidenciaReporte (solo matchea contra 'perdido' activos) como por
 * cualquier listado futuro que necesite excluir casos ya cerrados.
 */
export const ESTADOS_REPORTE_ACTIVOS = ['reportado', 'en_revision', 'en_atencion'] as const;

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
    public readonly especie: string | null,
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
      datos.especie,
      datos.estado,
      createdAt,
    );
  }
}
