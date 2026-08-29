/**
 * @jest-environment node
 */
import { PrismaNotificacionesRepositorio } from '@infraestructura/adaptadores/PrismaNotificacionesRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: { notificacion: { create: jest.fn() } },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: { notificacion: { create: jest.Mock } };
};

describe('PrismaNotificacionesRepositorio', () => {
  beforeEach(() => {
    prisma.notificacion.create.mockReset();
  });

  it('inserta la notificación con los datos recibidos', async () => {
    prisma.notificacion.create.mockResolvedValue({});
    const repo = new PrismaNotificacionesRepositorio();

    await repo.crear({
      usuarioId: 'vet-1',
      tipo: 'verificacion_resuelta',
      referenciaTabla: 'verificaciones',
      referenciaId: 'v1',
    });

    expect(prisma.notificacion.create).toHaveBeenCalledWith({
      data: {
        usuarioId: 'vet-1',
        tipo: 'verificacion_resuelta',
        referenciaTabla: 'verificaciones',
        referenciaId: 'v1',
      },
    });
  });
});
