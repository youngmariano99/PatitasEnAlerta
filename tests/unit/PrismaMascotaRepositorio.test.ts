/**
 * @jest-environment node
 */
import { PrismaMascotaRepositorio } from '@infraestructura/adaptadores/PrismaMascotaRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    mascota: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    mascota: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
};

const filaMascota = {
  id: 'mascota-1',
  duenoId: 'dueno-1',
  nombre: 'Toby',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
  raza: null,
  edadAproximada: null,
  identificacionChip: null,
};

const SELECT_MASCOTA = {
  id: true,
  duenoId: true,
  nombre: true,
  especie: true,
  fotoUrl: true,
  raza: true,
  edadAproximada: true,
  identificacionChip: true,
};

describe('PrismaMascotaRepositorio', () => {
  beforeEach(() => {
    prisma.mascota.create.mockReset();
    prisma.mascota.findFirst.mockReset();
    prisma.mascota.findMany.mockReset();
    prisma.mascota.update.mockReset();
  });

  it('mapea dueñoId -> duenoId al persistir y reconstruye la entidad con el id generado por la BD', async () => {
    prisma.mascota.create.mockResolvedValue(filaMascota);
    const repo = new PrismaMascotaRepositorio();

    const creada = await repo.crear({
      dueñoId: 'dueno-1',
      nombre: 'Toby',
      especie: 'perro',
      fotoUrl: filaMascota.fotoUrl,
      raza: null,
      edadAproximada: null,
      identificacionChip: null,
    });

    expect(prisma.mascota.create).toHaveBeenCalledWith({
      data: {
        duenoId: 'dueno-1',
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: filaMascota.fotoUrl,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      },
      select: SELECT_MASCOTA,
    });
    expect(creada.id).toBe('mascota-1');
    expect(creada.dueñoId).toBe('dueno-1');
  });

  it('buscarPorId filtra siempre por deleted_at IS NULL y retorna null si no encuentra nada', async () => {
    prisma.mascota.findFirst.mockResolvedValue(null);
    const repo = new PrismaMascotaRepositorio();

    const resultado = await repo.buscarPorId('mascota-inexistente');

    expect(prisma.mascota.findFirst).toHaveBeenCalledWith({
      where: { id: 'mascota-inexistente', deletedAt: null },
      select: SELECT_MASCOTA,
    });
    expect(resultado).toBeNull();
  });

  it('buscarPorId reconstruye la entidad cuando la encuentra', async () => {
    prisma.mascota.findFirst.mockResolvedValue(filaMascota);
    const repo = new PrismaMascotaRepositorio();

    const resultado = await repo.buscarPorId('mascota-1');

    expect(resultado?.id).toBe('mascota-1');
    expect(resultado?.dueñoId).toBe('dueno-1');
  });

  it('listarPorDueño filtra por dueño y deleted_at IS NULL, ordenado por creación descendente', async () => {
    prisma.mascota.findMany.mockResolvedValue([filaMascota]);
    const repo = new PrismaMascotaRepositorio();

    const resultado = await repo.listarPorDueño('dueno-1');

    expect(prisma.mascota.findMany).toHaveBeenCalledWith({
      where: { duenoId: 'dueno-1', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: SELECT_MASCOTA,
    });
    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.id).toBe('mascota-1');
  });

  it('actualizar solo envía a Prisma los campos provistos (undefined = no tocar), nunca dueñoId ni created_at', async () => {
    prisma.mascota.update.mockResolvedValue({ ...filaMascota, nombre: 'Tobias' });
    const repo = new PrismaMascotaRepositorio();

    const actualizada = await repo.actualizar('mascota-1', { nombre: 'Tobias' });

    expect(prisma.mascota.update).toHaveBeenCalledWith({
      where: { id: 'mascota-1' },
      data: {
        nombre: 'Tobias',
        especie: undefined,
        fotoUrl: undefined,
        raza: undefined,
        edadAproximada: undefined,
        identificacionChip: undefined,
      },
      select: SELECT_MASCOTA,
    });
    expect(actualizada.nombre).toBe('Tobias');
  });

  it('darDeBaja ejecuta un UPDATE seteando deleted_at, nunca un delete físico', async () => {
    prisma.mascota.update.mockResolvedValue({ ...filaMascota, deletedAt: new Date() });
    const repo = new PrismaMascotaRepositorio();

    await repo.darDeBaja('mascota-1');

    expect(prisma.mascota.update).toHaveBeenCalledWith({
      where: { id: 'mascota-1' },
      data: { deletedAt: expect.any(Date) },
    });
    expect((prisma.mascota as unknown as { delete?: unknown }).delete).toBeUndefined();
  });
});
