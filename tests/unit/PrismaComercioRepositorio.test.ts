/**
 * @jest-environment node
 */
import { PrismaComercioRepositorio } from '@infraestructura/adaptadores/PrismaComercioRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: { comercio: { create: jest.fn(), findFirst: jest.fn() } },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: { comercio: { create: jest.Mock; findFirst: jest.Mock } };
};

const usuarioId = '11111111-1111-1111-1111-111111111111';

const datos = {
  nombreComercio: 'Pet Shop Pringles',
  tipoComercio: 'pet_shop',
  direccion: 'Av. San Martín 500',
  latitud: -37.9989,
  longitud: -61.3565,
};

describe('PrismaComercioRepositorio', () => {
  beforeEach(() => {
    prisma.comercio.create.mockReset();
    prisma.comercio.findFirst.mockReset();
  });

  it('Paso 2: inserta con usuarioId de la sesión, sin fijar estado_verificacion (queda el DEFAULT "pendiente")', async () => {
    prisma.comercio.create.mockResolvedValue({ id: 'comercio-1', usuarioId, ...datos, estadoVerificacion: 'pendiente', createdAt: new Date('2026-09-14T10:00:00.000Z') });
    const repo = new PrismaComercioRepositorio();

    const resultado = await repo.crear(usuarioId, datos);

    expect(prisma.comercio.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usuarioId, ...datos } }),
    );
    expect(resultado.estadoVerificacion).toBe('pendiente');
  });

  it('obtenerPropio devuelve el comercio propio filtrando por usuarioId y deletedAt: null', async () => {
    prisma.comercio.findFirst.mockResolvedValue({ id: 'comercio-1', estadoVerificacion: 'verificado' });
    const repo = new PrismaComercioRepositorio();

    const resultado = await repo.obtenerPropio(usuarioId);

    expect(prisma.comercio.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId, deletedAt: null } }),
    );
    expect(resultado).toEqual({ id: 'comercio-1', estadoVerificacion: 'verificado' });
  });

  it('obtenerPropio devuelve null si el usuario nunca registró un comercio', async () => {
    prisma.comercio.findFirst.mockResolvedValue(null);
    const repo = new PrismaComercioRepositorio();

    expect(await repo.obtenerPropio(usuarioId)).toBeNull();
  });
});
