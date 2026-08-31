/**
 * @jest-environment node
 */
import { PrismaNotificacionesRepositorio } from '@infraestructura/adaptadores/PrismaNotificacionesRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    notificacion: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    notificacion: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock; updateMany: jest.Mock };
  };
};

describe('PrismaNotificacionesRepositorio', () => {
  beforeEach(() => {
    prisma.notificacion.create.mockReset();
    prisma.notificacion.findMany.mockReset();
    prisma.notificacion.count.mockReset();
    prisma.notificacion.updateMany.mockReset();
  });

  describe('crear', () => {
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

  describe('listarPorUsuario', () => {
    const filaNotificacion = {
      id: 'notif-1',
      tipo: 'reporte_coincidente',
      referenciaTabla: 'reportes',
      referenciaId: 'reporte-1',
      leido: false,
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
    };

    it('filtra por usuarioId, ordena por más reciente, y cuenta el total y las no leídas por separado', async () => {
      prisma.notificacion.findMany.mockResolvedValue([filaNotificacion]);
      prisma.notificacion.count.mockResolvedValueOnce(12).mockResolvedValueOnce(3);
      const repo = new PrismaNotificacionesRepositorio();

      const pagina = await repo.listarPorUsuario('usuario-1', 1, 50);

      expect(prisma.notificacion.findMany).toHaveBeenCalledWith({
        where: { usuarioId: 'usuario-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
        select: { id: true, tipo: true, referenciaTabla: true, referenciaId: true, leido: true, createdAt: true },
      });
      expect(prisma.notificacion.count).toHaveBeenNthCalledWith(1, { where: { usuarioId: 'usuario-1' } });
      expect(prisma.notificacion.count).toHaveBeenNthCalledWith(2, {
        where: { usuarioId: 'usuario-1', leido: false },
      });
      expect(pagina).toEqual({ items: [filaNotificacion], total: 12, pagina: 1, porPagina: 50, noLeidas: 3 });
    });

    it('pagina 2 con porPagina 20 pide skip=20, take=20', async () => {
      prisma.notificacion.findMany.mockResolvedValue([]);
      prisma.notificacion.count.mockResolvedValue(0);
      const repo = new PrismaNotificacionesRepositorio();

      await repo.listarPorUsuario('usuario-1', 2, 20);

      expect(prisma.notificacion.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }));
    });
  });

  describe('marcarComoLeida', () => {
    it('usa updateMany con id + usuarioId en el WHERE (nunca update simple)', async () => {
      prisma.notificacion.updateMany.mockResolvedValue({ count: 1 });
      const repo = new PrismaNotificacionesRepositorio();

      const resultado = await repo.marcarComoLeida('notif-1', 'usuario-1');

      expect(prisma.notificacion.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', usuarioId: 'usuario-1' },
        data: { leido: true },
      });
      expect(resultado).toBe(true);
    });

    it('devuelve false sin lanzar cuando no afectó ninguna fila (no existe o no es del usuario)', async () => {
      prisma.notificacion.updateMany.mockResolvedValue({ count: 0 });
      const repo = new PrismaNotificacionesRepositorio();

      await expect(repo.marcarComoLeida('notif-ajena', 'usuario-1')).resolves.toBe(false);
    });
  });
});
