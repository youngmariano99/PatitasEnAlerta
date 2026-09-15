/**
 * @jest-environment node
 */
import { PrismaProductosVeterinarioRepositorio } from '@infraestructura/adaptadores/PrismaProductosVeterinarioRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    productoVeterinario: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    productoVeterinario: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };
};

const productoId = '11111111-1111-1111-1111-111111111111';
const veterinarioId = '22222222-2222-2222-2222-222222222222';

const filaCruda = {
  id: productoId,
  veterinarioId,
  nombre: 'Antipulgas x3',
  descripcion: 'Pipeta mensual',
  precio: { toString: () => '4500.00' },
  stock: 20,
  createdAt: new Date('2026-09-15T10:00:00.000Z'),
};

describe('PrismaProductosVeterinarioRepositorio', () => {
  beforeEach(() => {
    Object.values(prisma.productoVeterinario).forEach((mockFn) => mockFn.mockReset());
  });

  describe('crear', () => {
    it('inserta el producto y convierte precio (Decimal) a number', async () => {
      prisma.productoVeterinario.create.mockResolvedValue(filaCruda);
      const repo = new PrismaProductosVeterinarioRepositorio();

      const resultado = await repo.crear(veterinarioId, { nombre: 'Antipulgas x3', descripcion: 'Pipeta mensual', precio: 4500, stock: 20 });

      expect(prisma.productoVeterinario.create).toHaveBeenCalledWith({
        data: { veterinarioId, nombre: 'Antipulgas x3', descripcion: 'Pipeta mensual', precio: 4500, stock: 20 },
        select: expect.objectContaining({ id: true, veterinarioId: true }),
      });
      expect(resultado.precio).toBe(4500);
      expect(typeof resultado.precio).toBe('number');
    });
  });

  describe('obtenerActual', () => {
    it('filtra por deletedAt: null y devuelve solo id/veterinarioId', async () => {
      prisma.productoVeterinario.findFirst.mockResolvedValue({ id: productoId, veterinarioId });
      const repo = new PrismaProductosVeterinarioRepositorio();

      const resultado = await repo.obtenerActual(productoId);

      expect(prisma.productoVeterinario.findFirst).toHaveBeenCalledWith({
        where: { id: productoId, deletedAt: null },
        select: { id: true, veterinarioId: true },
      });
      expect(resultado).toEqual({ id: productoId, veterinarioId });
    });

    it('devuelve null si no existe o está soft-deleted', async () => {
      prisma.productoVeterinario.findFirst.mockResolvedValue(null);
      const repo = new PrismaProductosVeterinarioRepositorio();

      await expect(repo.obtenerActual(productoId)).resolves.toBeNull();
    });
  });

  describe('actualizar', () => {
    const datos = { nombre: 'Antipulgas x6', descripcion: null, precio: 8000, stock: 10 };

    it('AC: UPDATE condicionado por id + veterinarioId (anti-IDOR)', async () => {
      prisma.productoVeterinario.updateMany.mockResolvedValue({ count: 1 });
      prisma.productoVeterinario.findUniqueOrThrow.mockResolvedValue({ ...filaCruda, ...datos, precio: { toString: () => '8000.00' } });
      const repo = new PrismaProductosVeterinarioRepositorio();

      const resultado = await repo.actualizar(productoId, veterinarioId, datos);

      expect(prisma.productoVeterinario.updateMany).toHaveBeenCalledWith({
        where: { id: productoId, veterinarioId, deletedAt: null },
        data: datos,
      });
      expect(resultado?.nombre).toBe('Antipulgas x6');
    });

    it('devuelve null cuando 0 filas afectadas (no existe o no pertenece al veterinario)', async () => {
      prisma.productoVeterinario.updateMany.mockResolvedValue({ count: 0 });
      const repo = new PrismaProductosVeterinarioRepositorio();

      await expect(repo.actualizar(productoId, veterinarioId, datos)).resolves.toBeNull();
      expect(prisma.productoVeterinario.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('darDeBaja', () => {
    it('AC: UPDATE (soft delete) condicionado por id + veterinarioId', async () => {
      prisma.productoVeterinario.updateMany.mockResolvedValue({ count: 1 });
      const repo = new PrismaProductosVeterinarioRepositorio();

      const resultado = await repo.darDeBaja(productoId, veterinarioId);

      expect(prisma.productoVeterinario.updateMany).toHaveBeenCalledWith({
        where: { id: productoId, veterinarioId, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(resultado).toBe(true);
    });

    it('devuelve false cuando 0 filas afectadas', async () => {
      prisma.productoVeterinario.updateMany.mockResolvedValue({ count: 0 });
      const repo = new PrismaProductosVeterinarioRepositorio();

      await expect(repo.darDeBaja(productoId, veterinarioId)).resolves.toBe(false);
    });
  });

  describe('listarPropios', () => {
    it('filtra por veterinarioId (incluye agotados) y pagina', async () => {
      prisma.productoVeterinario.findMany.mockResolvedValue([filaCruda]);
      prisma.productoVeterinario.count.mockResolvedValue(1);
      const repo = new PrismaProductosVeterinarioRepositorio();

      const resultado = await repo.listarPropios(veterinarioId, 1, 50);

      expect(prisma.productoVeterinario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { veterinarioId, deletedAt: null }, skip: 0, take: 50 }),
      );
      expect(resultado.total).toBe(1);
      expect(resultado.items[0]!.precio).toBe(4500);
    });
  });

  describe('listarActivos', () => {
    it('lista de cualquier veterinario, filtrando solo por deletedAt: null', async () => {
      prisma.productoVeterinario.findMany.mockResolvedValue([filaCruda]);
      prisma.productoVeterinario.count.mockResolvedValue(1);
      const repo = new PrismaProductosVeterinarioRepositorio();

      await repo.listarActivos(1, 50);

      expect(prisma.productoVeterinario.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deletedAt: null } }));
    });
  });
});
