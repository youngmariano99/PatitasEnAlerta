export interface DatosSugerenciaCompatibilidad {
  cuestionarioId: string;
  vitrinaAdopcionId: string;
  scoreCompatibilidad: number;
  metodo: string;
}

/** Fila de `sugerencias_compatibilidad` (docs/SCHEMA.md, Módulo 9) — registro auditable, INSERT-only, nunca actualizado ni borrado. */
export interface SugerenciaCompatibilidad extends DatosSugerenciaCompatibilidad {
  id: string;
  generadoEn: Date;
}

/**
 * Puerto hacia `sugerencias_compatibilidad` (Módulo 9, Historia "Sugerencias
 * de compatibilidad de adopción"). Acotado al alta (Paso 2 del ticket) — el
 * listado de sugerencias propias queda para el ticket que implemente esa
 * historia puntual, mismo criterio de entrega incremental ya establecido en
 * el resto del proyecto.
 */
export interface IRepositorioSugerenciasCompatibilidad {
  crear(datos: DatosSugerenciaCompatibilidad): Promise<SugerenciaCompatibilidad>;
}
