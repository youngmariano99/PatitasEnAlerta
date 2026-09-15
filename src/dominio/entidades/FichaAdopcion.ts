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
  /**
   * Atributos estructurados de compatibilidad (Módulo 9, Post-MVP —
   * "Publicación de ficha de adopción con atributos de compatibilidad").
   * Nullable/opcionales: ninguna ficha del MVP los completa, y no bloquean
   * la publicación si faltan. Alimentan `sugerencias_compatibilidad` —
   * `EstrategiaMatchAdopcion` (cuando se implemente) los lee para calcular
   * `score_compatibilidad` contra el cuestionario del adoptante
   * (docs/SCHEMA.md, `cuestionarios_adoptante`/`sugerencias_compatibilidad`).
   */
  nivelEnergia: string | null;
  compatibleNinos: boolean | null;
  compatibleOtrosAnimales: boolean | null;
  necesidadesMedicasDetalle: string | null;
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
    public readonly nivelEnergia: string | null,
    public readonly compatibleNinos: boolean | null,
    public readonly compatibleOtrosAnimales: boolean | null,
    public readonly necesidadesMedicasDetalle: string | null,
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
      datos.nivelEnergia,
      datos.compatibleNinos,
      datos.compatibleOtrosAnimales,
      datos.necesidadesMedicasDetalle,
      createdAt,
    );
  }
}
