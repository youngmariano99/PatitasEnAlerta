export interface DatosFichaAdopcion {
  municipioId: string;
  nombreAnimal: string;
  especie: string;
  edadAproximada: number | null;
  tamano: string | null;
  temperamento: string | null;
  estadoSalud: string | null;
  requisitosAdopcion: string | null;
  fotoUrl: string;
  estado: string;
}

/** Todos los estados válidos de una ficha (docs/SCHEMA.md, CHECK estado sobre `vitrina_adopcion`). */
export const ESTADOS_FICHA_ADOPCION_SOPORTADOS = ['disponible', 'adoptado', 'baja'] as const;
export type EstadoFichaAdopcion = (typeof ESTADOS_FICHA_ADOPCION_SOPORTADOS)[number];

/**
 * Entidad de dominio FichaAdopcion (vitrina de adopción — Módulo 3).
 * Representa siempre una ficha ya persistida (con `id` y `createdAt`) — el
 * alta se modela con `DatosFichaAdopcion` (sin id) en el puerto del
 * repositorio, mismo criterio que Evento.ts/Reporte.ts.
 */
export class FichaAdopcion {
  private constructor(
    public readonly id: string,
    public readonly municipioId: string,
    public readonly nombreAnimal: string,
    public readonly especie: string,
    public readonly edadAproximada: number | null,
    public readonly tamano: string | null,
    public readonly temperamento: string | null,
    public readonly estadoSalud: string | null,
    public readonly requisitosAdopcion: string | null,
    public readonly fotoUrl: string,
    public readonly estado: string,
    public readonly createdAt: Date,
  ) {}

  static reconstruir(id: string, datos: DatosFichaAdopcion, createdAt: Date): FichaAdopcion {
    return new FichaAdopcion(
      id,
      datos.municipioId,
      datos.nombreAnimal,
      datos.especie,
      datos.edadAproximada,
      datos.tamano,
      datos.temperamento,
      datos.estadoSalud,
      datos.requisitosAdopcion,
      datos.fotoUrl,
      datos.estado,
      createdAt,
    );
  }
}
