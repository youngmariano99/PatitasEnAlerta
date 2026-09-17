export interface DatosNuevoPedido {
  productoId: string;
  compradorId: string;
  cantidad: number;
}

export interface PedidoCreado {
  id: string;
  productoId: string;
  compradorId: string;
  cantidad: number;
  precioUnitario: number;
  estado: string;
  createdAt: Date;
}

export interface PaginaPedidos {
  items: PedidoCreado[];
  total: number;
  pagina: number;
  porPagina: number;
}

export type EstadoPedidoTransicionable = 'confirmado' | 'cancelado';

/**
 * Puerto hacia `pedidos_producto` (Módulo 6 — Veterinarios Avanzado,
 * Post-MVP). `GenerarPedidoCommand.ts` depende únicamente de esta
 * abstracción, nunca de Prisma directamente. Ciclo de vida completo por
 * rol según `docs/ROLES.md`: `dueño CR(p)` (alta + lectura de lo propio) y
 * `veterinario RU(p, de sus productos)` (lectura + confirmar/cancelar los
 * pedidos recibidos sobre su propio catálogo).
 */
export interface IRepositorioPedidosProducto {
  /**
   * Transacción atómica (Paso 3 del ticket): dentro de la misma transacción,
   * `UPDATE productos_veterinario SET stock = stock - cantidad WHERE id=?
   * AND stock >= cantidad AND deleted_at IS NULL` y, solo si esa fila fue
   * afectada, `INSERT` en `pedidos_producto` con `precio_unitario` tomado
   * del producto en ese momento (snapshot — el precio puede cambiar después
   * sin afectar pedidos ya generados). `null` si el UPDATE condicionado
   * afectó 0 filas — `GenerarPedidoCommand.persistir()` lo traduce siempre a
   * PEA-VETADV-001 (409): la existencia del producto ya se validó por
   * separado en `validar()` (PEA-VETADV-002 si no existe), mismo criterio
   * que `ReservarTurnoCommand`/`TurnoYaReservadoError`.
   */
  crear(datos: DatosNuevoPedido): Promise<PedidoCreado | null>;

  /** `dueño CR(p)` (docs/ROLES.md, Módulo 6): el comprador ve únicamente sus propios pedidos. */
  listarPorComprador(
    compradorId: string,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaPedidos>;

  /** `veterinario RU(p, de sus productos)` (docs/ROLES.md, Módulo 6): pedidos recibidos sobre productos propios. */
  listarPorVeterinario(
    veterinarioId: string,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaPedidos>;

  /**
   * Transición de estado: solo el veterinario dueño del producto puede
   * confirmar o cancelar un pedido, y solo mientras esté en `pendiente`
   * (máquina de estados `pedidos_producto`, docs/SCHEMA.md —
   * `confirmado`/`cancelado` son terminales). `null` si el pedido no
   * existe, no pertenece a un producto de `veterinarioId`, o ya no está en
   * `pendiente` — el caso de uso lo traduce siempre a PEA-VETADV-004 (409),
   * mismo criterio anti-carrera que `GenerarPedidoCommand`.
   */
  actualizarEstado(
    pedidoId: string,
    veterinarioId: string,
    nuevoEstado: EstadoPedidoTransicionable,
  ): Promise<PedidoCreado | null>;
}
