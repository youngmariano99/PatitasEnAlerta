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

/**
 * Puerto hacia `pedidos_producto` (Módulo 6 — Veterinarios Avanzado,
 * Post-MVP). `GenerarPedidoCommand.ts` depende únicamente de esta
 * abstracción, nunca de Prisma directamente. Alcance acotado a esta
 * actividad: solo el alta (Pasos 2/3 del ticket). El resto del ciclo de
 * vida descrito en `docs/ROLES.md` (`veterinario RU(p, de sus productos)` —
 * confirmar/cancelar un pedido propio) queda para el ticket que implemente
 * esa historia puntual, mismo criterio de entrega incremental que
 * `solicitudes_recurso`/`colaboraciones`.
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
}
