import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosNuevoPedido,
  EstadoPedidoTransicionable,
  IRepositorioPedidosProducto,
  PaginaPedidos,
  PedidoCreado,
} from '@dominio/puertos/IRepositorioPedidosProducto';

const SELECT_PEDIDO = {
  id: true,
  productoId: true,
  compradorId: true,
  cantidad: true,
  precioUnitario: true,
  estado: true,
  createdAt: true,
} as const;

function aPedidoCreado(pedido: {
  id: string;
  productoId: string;
  compradorId: string;
  cantidad: number;
  precioUnitario: { toString(): string };
  estado: string;
  createdAt: Date;
}): PedidoCreado {
  return {
    id: pedido.id,
    productoId: pedido.productoId,
    compradorId: pedido.compradorId,
    cantidad: pedido.cantidad,
    precioUnitario: Number(pedido.precioUnitario),
    estado: pedido.estado,
    createdAt: pedido.createdAt,
  };
}

@injectable()
export class PrismaPedidosProductoRepositorio implements IRepositorioPedidosProducto {
  async crear(datos: DatosNuevoPedido): Promise<PedidoCreado | null> {
    return prisma.$transaction(async (tx) => {
      const producto = await tx.productoVeterinario.findFirst({
        where: { id: datos.productoId, deletedAt: null },
        select: { precio: true },
      });
      if (!producto) return null;

      // Paso 3 del ticket: UPDATE condicionado (stock >= cantidad) dentro de
      // la misma transacción que el INSERT del pedido — evita la carrera
      // entre dos pedidos concurrentes sobre el último stock disponible.
      // 0 filas afectadas = sin stock suficiente (PEA-VETADV-001).
      const resultado = await tx.productoVeterinario.updateMany({
        where: { id: datos.productoId, stock: { gte: datos.cantidad }, deletedAt: null },
        data: { stock: { decrement: datos.cantidad } },
      });
      if (resultado.count === 0) return null;

      const pedido = await tx.pedidoProducto.create({
        data: {
          productoId: datos.productoId,
          compradorId: datos.compradorId,
          cantidad: datos.cantidad,
          // Snapshot del precio en el momento del pedido — un cambio de
          // precio posterior del veterinario no afecta pedidos ya generados.
          precioUnitario: producto.precio,
        },
        select: SELECT_PEDIDO,
      });

      return aPedidoCreado(pedido);
    });
  }

  async listarPorComprador(
    compradorId: string,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaPedidos> {
    const where = { compradorId, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.pedidoProducto.findMany({
        where,
        select: SELECT_PEDIDO,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.pedidoProducto.count({ where }),
    ]);
    return { items: items.map(aPedidoCreado), total, pagina, porPagina };
  }

  async listarPorVeterinario(
    veterinarioId: string,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaPedidos> {
    // `pedidos_producto` no tiene relación Prisma declarada hacia
    // `productos_veterinario` (solo el FK crudo `producto_id`, docs/SCHEMA.md)
    // — se resuelve en dos pasos: productos propios, luego pedidos sobre esos ids.
    const productosPropios = await prisma.productoVeterinario.findMany({
      where: { veterinarioId },
      select: { id: true },
    });
    const productoIds = productosPropios.map((p) => p.id);
    if (productoIds.length === 0) {
      return { items: [], total: 0, pagina, porPagina };
    }

    const where = { deletedAt: null, productoId: { in: productoIds } };
    const [items, total] = await Promise.all([
      prisma.pedidoProducto.findMany({
        where,
        select: SELECT_PEDIDO,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.pedidoProducto.count({ where }),
    ]);
    return { items: items.map(aPedidoCreado), total, pagina, porPagina };
  }

  async actualizarEstado(
    pedidoId: string,
    veterinarioId: string,
    nuevoEstado: EstadoPedidoTransicionable,
  ): Promise<PedidoCreado | null> {
    // Misma limitación de relación que `listarPorVeterinario`: el ownership
    // se confirma dentro de la transacción (lectura + UPDATE condicionado
    // por `estado='pendiente'`) antes de transicionar — 0 filas afectadas o
    // ownership ausente colapsan siempre en PEA-VETADV-004, sin distinguir
    // el motivo al cliente, mismo criterio anti-carrera que `crear()`.
    return prisma.$transaction(async (tx) => {
      const pedido = await tx.pedidoProducto.findFirst({
        where: { id: pedidoId, estado: 'pendiente', deletedAt: null },
        select: { productoId: true },
      });
      if (!pedido) return null;

      const producto = await tx.productoVeterinario.findFirst({
        where: { id: pedido.productoId, veterinarioId },
        select: { id: true },
      });
      if (!producto) return null;

      const resultado = await tx.pedidoProducto.updateMany({
        where: { id: pedidoId, estado: 'pendiente', deletedAt: null },
        data: { estado: nuevoEstado },
      });
      if (resultado.count === 0) return null;

      const actualizado = await tx.pedidoProducto.findUniqueOrThrow({
        where: { id: pedidoId },
        select: SELECT_PEDIDO,
      });
      return aPedidoCreado(actualizado);
    });
  }
}
