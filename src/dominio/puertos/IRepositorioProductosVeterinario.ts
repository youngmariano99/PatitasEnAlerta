export interface DatosProducto {
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
}

export interface ProductoVeterinario extends DatosProducto {
  id: string;
  veterinarioId: string;
  createdAt: Date;
}

/** Proyección mínima para autorizar una escritura sobre un producto puntual (Paso 1, AC "editar producto de otro veterinario → 403"). */
export interface ProductoActual {
  id: string;
  veterinarioId: string;
}

export interface PaginaProductos {
  items: ProductoVeterinario[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Puerto hacia `productos_veterinario` (Módulo 6 — Veterinarios Avanzado,
 * Post-MVP). `CrearProductoVeterinario`/`ActualizarProductoVeterinario`/
 * `DarDeBajaProductoVeterinario`/`ListarMisProductos`/`ListarProductosActivos`
 * dependen únicamente de esta abstracción, nunca de Prisma directamente.
 *
 * `docs/ROLES.md`: escritura por Patrón A (100% propia, `veterinario_id =
 * auth.uid()`, mismo criterio que `mascotas`); lectura por Patrón B
 * (pública, `deleted_at IS NULL`, mismo criterio que `reportes`/`eventos`) —
 * de ahí la distinción entre `listarPropios` (agenda del veterinario) y
 * `listarActivos` (catálogo público que consume `GenerarPedidoCommand`).
 */
export interface IRepositorioProductosVeterinario {
  crear(veterinarioId: string, datos: DatosProducto): Promise<ProductoVeterinario>;
  /** `null` si no existe o está soft-deleted (PEA-VETADV-002). */
  obtenerActual(productoId: string): Promise<ProductoActual | null>;
  /**
   * UPDATE condicionado por `id` + `veterinario_id` (anti-IDOR) — `null` si
   * 0 filas afectadas (no existe, soft-deleted, o no pertenece a
   * `veterinarioId`). Reemplaza los 4 campos editables completos, mismo
   * criterio de "sin merge parcial" que `IRepositorioDisponibilidad.actualizar`.
   */
  actualizar(productoId: string, veterinarioId: string, datos: DatosProducto): Promise<ProductoVeterinario | null>;
  /** Soft delete condicionado por `id` + `veterinario_id` — `true` si afectó 1 fila. */
  darDeBaja(productoId: string, veterinarioId: string): Promise<boolean>;
  /** Todos los productos propios no eliminados (activos e inactivos en stock) — vista de gestión del propio veterinario. */
  listarPropios(veterinarioId: string, pagina: number, porPagina: number): Promise<PaginaProductos>;
  /** Catálogo público — solo productos no soft-deleted, de cualquier veterinario. */
  listarActivos(pagina: number, porPagina: number): Promise<PaginaProductos>;
}
