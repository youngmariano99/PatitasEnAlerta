import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { DatosNuevoPedido, IRepositorioPedidosProducto, PedidoCreado } from '@dominio/puertos/IRepositorioPedidosProducto';

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
        select: {
          id: true,
          productoId: true,
          compradorId: true,
          cantidad: true,
          precioUnitario: true,
          estado: true,
          createdAt: true,
        },
      });

      return {
        id: pedido.id,
        productoId: pedido.productoId,
        compradorId: pedido.compradorId,
        cantidad: pedido.cantidad,
        precioUnitario: Number(pedido.precioUnitario),
        estado: pedido.estado,
        createdAt: pedido.createdAt,
      };
    });
  }
}
