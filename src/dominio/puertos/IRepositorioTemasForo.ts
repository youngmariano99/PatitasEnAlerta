export interface DatosTemaForo {
  titulo: string;
  contenido: string;
}

/** Fila de `temas_foro` (docs/SCHEMA.md, Módulo 8). */
export interface TemaForo extends DatosTemaForo {
  id: string;
  creadoPor: string;
  createdAt: Date;
}

/**
 * Proyección mínima para autorizar sobre un tema puntual. A diferencia de
 * `ProductoComercioActual` (que excluye soft-deleted, porque ahí "borrado"
 * siempre significa "no encontrado"), acá SÍ necesitamos distinguir el
 * soft-delete de moderación: editar un tema moderado por Administrador
 * (Paso 3 del ticket) tiene que responder 403/PEA-FORO-004, distinto de
 * editar uno que directamente nunca existió (404/PEA-FORO-002).
 */
export interface TemaForoActual {
  id: string;
  creadoPor: string;
  moderado: boolean;
}

/**
 * Puerto hacia `temas_foro` (Módulo 8, Historia "Publicación de contenido
 * educativo en el foro"). Acotado al alta (Paso 1), edición propia con
 * bloqueo post-moderación (Paso 3) y moderación por Administrador (Paso 2)
 * — el listado y `respuestas_foro` quedan para el ticket que implemente esa
 * historia puntual, mismo criterio de entrega incremental que
 * `IRepositorioCursos`.
 */
export interface IRepositorioTemasForo {
  crear(creadoPor: string, datos: DatosTemaForo): Promise<TemaForo>;

  /** Incluye temas soft-deleted (ver `TemaForoActual`). `null` solo si el id nunca existió. */
  obtenerActual(id: string): Promise<TemaForoActual | null>;

  /**
   * UPDATE condicionado a `id + creadoPor + deletedAt IS NULL` — `null` si
   * ninguna fila matchea (no existe, es de otro autor, o ya fue moderado),
   * nunca confiado en una lectura previa de `obtenerActual`.
   */
  actualizar(id: string, creadoPor: string, datos: DatosTemaForo): Promise<TemaForo | null>;

  /** Soft delete de moderación (Administrador) condicionado a `id + deletedAt IS NULL`. `false` si ninguna fila matchea. */
  moderar(id: string): Promise<boolean>;
}
