export interface DatosProductoComercio {
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number | null;
}

/** Fila de `productos_comercio` (docs/SCHEMA.md, Módulo 7). */
export interface ProductoComercio extends DatosProductoComercio {
  id: string;
  comercioId: string;
  createdAt: Date;
}

/** Proyección mínima para chequeos de pertenencia — mismo criterio que `ProductoActual` (Módulo 6). */
export interface ProductoComercioActual {
  id: string;
  comercioId: string;
}

/**
 * Puerto hacia `productos_comercio` (Módulo 7, Historia "Publicación de
 * catálogo de productos"). Acotado al alta/edición/baja restringidas al
 * comercio propio (Paso 1 del ticket) — el listado (`R(t)` para
 * comerciante/dueño/administrador/Público en docs/ROLES.md) queda para el
 * ticket que implemente esa historia puntual, mismo criterio de entrega
 * incremental ya establecido en este sprint.
 */
export interface IRepositorioProductosComercio {
  crear(comercioId: string, datos: DatosProductoComercio): Promise<ProductoComercio>;

  /** `null` si el id no existe o está soft-deleted. */
  obtenerActual(id: string): Promise<ProductoComercioActual | null>;

  /**
   * UPDATE condicionado a `id + comercioId + deletedAt IS NULL` — `null` si
   * ninguna fila matchea (no existe, es de otro comercio, o ya estaba
   * soft-deleted), nunca confiado en una lectura previa de `obtenerActual`.
   */
  actualizar(id: string, comercioId: string, datos: DatosProductoComercio): Promise<ProductoComercio | null>;

  /** Soft delete (`deleted_at = now()`) condicionado a `id + comercioId`. `false` si ninguna fila matchea. */
  darDeBaja(id: string, comercioId: string): Promise<boolean>;
}
