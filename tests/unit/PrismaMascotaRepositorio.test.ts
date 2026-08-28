/**
 * @jest-environment node
 */
import { PrismaMascotaRepositorio } from '@infraestructura/adaptadores/PrismaMascotaRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: { mascota: { create: jest.fn() } },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: { mascota: { create: jest.Mock } };
};

describe('PrismaMascotaRepositorio', () => {
  beforeEach(() => {
    prisma.mascota.create.mockReset();
  });

  it('mapea dueñoId -> duenoId al persistir y reconstruye la entidad con el id generado por la BD', async () => {
    prisma.mascota.create.mockResolvedValue({
      id: 'mascota-1',
      duenoId: 'dueno-1',
      nombre: 'Toby',
      especie: 'perro',
      fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
      raza: null,
      edadAproximada: null,
      identificacionChip: null,
    });
    const repo = new PrismaMascotaRepositorio();

    const creada = await repo.crear({
      dueñoId: 'dueno-1',
      nombre: 'Toby',
      especie: 'perro',
      fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
      raza: null,
      edadAproximada: null,
      identificacionChip: null,
    });

    expect(prisma.mascota.create).toHaveBeenCalledWith({
      data: {
        duenoId: 'dueno-1',
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      },
      select: {
        id: true,
        duenoId: true,
        nombre: true,
        especie: true,
        fotoUrl: true,
        raza: true,
        edadAproximada: true,
        identificacionChip: true,
      },
    });
    expect(creada.id).toBe('mascota-1');
    expect(creada.dueñoId).toBe('dueno-1');
  });
});
