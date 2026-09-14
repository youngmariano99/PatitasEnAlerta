/**
 * @jest-environment node
 */
import { PrismaPedidosProductoRepositorio } from '@infraestructura/adaptadores/PrismaPedidosProductoRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: { $transaction: jest.fn() },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as { prisma: { $transaction: jest.Mock } };

const productoId = '11111111-1111-1111-1111-111111111111';
const compradorId = '22222222-2222-2222-2222-222222222222';

function crearTxMock() {
  return {
    productoVeterinario: { findFirst: jest.fn(), updateMany: jest.fn() },
    pedidoProducto: { create: jest.fn() },
  };
}

describe('PrismaPedidosProductoRepositorio', () => {
  beforeEach(() => {
    prisma.$transaction.mockReset();
  });

  it('Paso 3 / AC: UPDATE condicionado por stock >= cantidad e INSERT del pedido, dentro de la misma transacción', async () => {
    const tx = crearTxMock();
    tx.productoVeterinario.findFirst.mockResolvedValue({ precio: { toString: () => '4500.00' } });
    tx.productoVeterinario.updateMany.mockResolvedValue({ count: 1 });
    tx.pedidoProducto.create.mockResolvedValue({
      id: 'pedido-1',
      productoId,
      compradorId,
      cantidad: 2,
      precioUnitario: { toString: () => '4500.00' },
      estado: 'pendiente',
      createdAt: new Date('2026-09-15T10:00:00.000Z'),
    });
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));
    const repo = new PrismaPedidosProductoRepositorio();

    const resultado = await repo.crear({ productoId, compradorId, cantidad: 2 });

    expect(tx.productoVeterinario.updateMany).toHaveBeenCalledWith({
      where: { id: productoId, stock: { gte: 2 }, deletedAt: null },
      data: { stock: { decrement: 2 } },
    });
    expect(tx.pedidoProducto.create).toHaveBeenCalledWith({
      data: { productoId, compradorId, cantidad: 2, precioUnitario: { toString: expect.any(Function) } },
      select: expect.objectContaining({ id: true, estado: true }),
    });
    expect(resultado).toEqual({
      id: 'pedido-1',
      productoId,
      compradorId,
      cantidad: 2,
      precioUnitario: 4500,
      estado: 'pendiente',
      createdAt: new Date('2026-09-15T10:00:00.000Z'),
    });
  });

  it('AC: devuelve null (sin insertar el pedido) cuando el UPDATE condicionado no afecta ninguna fila — sin stock suficiente', async () => {
    const tx = crearTxMock();
    tx.productoVeterinario.findFirst.mockResolvedValue({ precio: { toString: () => '4500.00' } });
    tx.productoVeterinario.updateMany.mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));
    const repo = new PrismaPedidosProductoRepositorio();

    const resultado = await repo.crear({ productoId, compradorId, cantidad: 100 });

    expect(resultado).toBeNull();
    expect(tx.pedidoProducto.create).not.toHaveBeenCalled();
  });

  it('devuelve null si el producto no existe o está soft-deleted, sin intentar el UPDATE de stock', async () => {
    const tx = crearTxMock();
    tx.productoVeterinario.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));
    const repo = new PrismaPedidosProductoRepositorio();

    const resultado = await repo.crear({ productoId, compradorId, cantidad: 1 });

    expect(resultado).toBeNull();
    expect(tx.productoVeterinario.updateMany).not.toHaveBeenCalled();
  });
});
