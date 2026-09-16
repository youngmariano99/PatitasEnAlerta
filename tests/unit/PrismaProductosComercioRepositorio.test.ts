/**
 * @jest-environment node
 */
import { PrismaProductosComercioRepositorio } from '@infraestructura/adaptadores/PrismaProductosComercioRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: { productoComercio: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() } },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    productoComercio: {
      create: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };
};

const comercioId = '22222222-2222-2222-2222-222222222222';
const productoId = '33333333-3333-3333-3333-333333333333';

const datos = { nombre: 'Arena sanitaria 10L', descripcion: 'Alta absorción', categoria: 'higiene', precio: 4200 };

describe('PrismaProductosComercioRepositorio', () => {
  beforeEach(() => {
    prisma.productoComercio.create.mockReset();
    prisma.productoComercio.findFirst.mockReset();
    prisma.productoComercio.updateMany.mockReset();
    prisma.productoComercio.findUniqueOrThrow.mockReset();
  });

  it('crea el producto y convierte el precio Decimal a number', async () => {
    prisma.productoComercio.create.mockResolvedValue({
      id: productoId,
      comercioId,
      ...datos,
      precio: { toString: () => '4200.00' },
      createdAt: new Date('2026-09-14T10:00:00.000Z'),
    });
    const repo = new PrismaProductosComercioRepositorio();

    const resultado = await repo.crear(comercioId, datos);

    expect(prisma.productoComercio.create).toHaveBeenCalledWith(expect.objectContaining({ data: { comercioId, ...datos } }));
    expect(resultado.precio).toBe(4200);
  });

  it('actualizar devuelve null si ninguna fila matchea id + comercioId', async () => {
    prisma.productoComercio.updateMany.mockResolvedValue({ count: 0 });
    const repo = new PrismaProductosComercioRepositorio();

    const resultado = await repo.actualizar(productoId, comercioId, datos);

    expect(resultado).toBeNull();
    expect(prisma.productoComercio.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('actualizar re-lee la fila cuando el UPDATE afectó una fila (updateMany no devuelve la fila)', async () => {
    prisma.productoComercio.updateMany.mockResolvedValue({ count: 1 });
    prisma.productoComercio.findUniqueOrThrow.mockResolvedValue({
      id: productoId,
      comercioId,
      ...datos,
      precio: { toString: () => '4200.00' },
      createdAt: new Date('2026-09-14T10:00:00.000Z'),
    });
    const repo = new PrismaProductosComercioRepositorio();

    const resultado = await repo.actualizar(productoId, comercioId, datos);

    expect(resultado?.nombre).toBe(datos.nombre);
  });

  it('darDeBaja devuelve false si ninguna fila matchea id + comercioId', async () => {
    prisma.productoComercio.updateMany.mockResolvedValue({ count: 0 });
    const repo = new PrismaProductosComercioRepositorio();

    expect(await repo.darDeBaja(productoId, comercioId)).toBe(false);
  });

  it('darDeBaja devuelve true cuando el soft delete afecta la fila propia', async () => {
    prisma.productoComercio.updateMany.mockResolvedValue({ count: 1 });
    const repo = new PrismaProductosComercioRepositorio();

    expect(await repo.darDeBaja(productoId, comercioId)).toBe(true);
    expect(prisma.productoComercio.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: productoId, comercioId, deletedAt: null } }),
    );
  });

  it('obtenerActual devuelve la proyección mínima (id + comercioId) filtrando por deletedAt: null', async () => {
    prisma.productoComercio.findFirst.mockResolvedValue({ id: productoId, comercioId });
    const repo = new PrismaProductosComercioRepositorio();

    const resultado = await repo.obtenerActual(productoId);

    expect(prisma.productoComercio.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: productoId, deletedAt: null } }),
    );
    expect(resultado).toEqual({ id: productoId, comercioId });
  });

  it('obtenerActual devuelve null si el producto no existe o está soft-deleted', async () => {
    prisma.productoComercio.findFirst.mockResolvedValue(null);
    const repo = new PrismaProductosComercioRepositorio();

    expect(await repo.obtenerActual(productoId)).toBeNull();
  });

  it('convierte un precio null a null (producto sin precio cargado)', async () => {
    prisma.productoComercio.create.mockResolvedValue({
      id: productoId,
      comercioId,
      ...datos,
      precio: null,
      createdAt: new Date('2026-09-14T10:00:00.000Z'),
    });
    const repo = new PrismaProductosComercioRepositorio();

    const resultado = await repo.crear(comercioId, { ...datos, precio: null });

    expect(resultado.precio).toBeNull();
  });
});
