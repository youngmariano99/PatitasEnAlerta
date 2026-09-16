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

/** Proyección de listado — misma forma que `TemaForo`, nombrada aparte para no acoplar el contrato de lectura pública al de alta/edición. */
export type TemaForoListado = TemaForo;

export interface PaginaTemasForo {
  items: TemaForoListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** Fila de `respuestas_foro` (docs/SCHEMA.md, Módulo 8). */
export interface RespuestaForo {
  id: string;
  temaId: string;
  usuarioId: string;
  contenido: string;
  createdAt: Date;
}

/**
 * Puerto hacia `temas_foro`/`respuestas_foro` (Módulo 8, Historia
 * "Publicación de contenido educativo en el foro" + "Consulta del foro de
 * bienestar animal"). Acotado al alta (Paso 1), edición propia con bloqueo
 * post-moderación (Paso 3 de CrearTemaForo), moderación por Administrador
 * (Paso 2 de CrearTemaForo) y el listado paginado de ambas tablas (este
 * ticket) — las respuestas al foro (alta de una respuesta) quedan para el
 * ticket que implemente esa historia puntual, mismo criterio de entrega
 * incremental que `IRepositorioCursos`.
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

  /** Temas activos (`deletedAt IS NULL` — un tema moderado no aparece en el listado público), ordenados por `createdAt` descendente, paginados server-side (Paso 1, tope 50 ya clampeado por `ListarForo`). */
  listar(pagina: number, porPagina: number): Promise<PaginaTemasForo>;

  /** Respuestas activas de un tema, vía `ix_respuestas_tema` (Paso 2), ordenadas por `createdAt` ascendente (orden cronológico de un hilo). */
  listarRespuestas(temaId: string): Promise<RespuestaForo[]>;
}
