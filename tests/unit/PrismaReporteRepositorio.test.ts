/**
 * @jest-environment node
 */
import { PrismaReporteRepositorio } from '@infraestructura/adaptadores/PrismaReporteRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    reporte: {
      create: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: { reporte: { create: jest.Mock } };
};

const SELECT_REPORTE = {
  id: true,
  tipo: true,
  subtipo: true,
  reportadoPor: true,
  mascotaId: true,
  descripcion: true,
  fotoUrl: true,
  latitud: true,
  longitud: true,
  estado: true,
  createdAt: true,
};

const filaReporte = {
  id: 'reporte-1',
  tipo: 'perdido',
  subtipo: null,
  reportadoPor: 'usuario-1',
  mascotaId: null,
  descripcion: 'Se perdió cerca de la plaza.',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg',
  latitud: -37.9989,
  longitud: -61.3565,
  estado: 'reportado',
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
};

describe('PrismaReporteRepositorio', () => {
  beforeEach(() => {
    prisma.reporte.create.mockReset();
  });

  it('crea el reporte sin enviar `estado` a Prisma (nace en el DEFAULT \'reportado\' de la columna)', async () => {
    prisma.reporte.create.mockResolvedValue(filaReporte);
    const repo = new PrismaReporteRepositorio();

    const creado = await repo.crear({
      tipo: 'perdido',
      subtipo: null,
      reportadoPor: 'usuario-1',
      mascotaId: null,
      descripcion: filaReporte.descripcion,
      fotoUrl: filaReporte.fotoUrl,
      latitud: filaReporte.latitud,
      longitud: filaReporte.longitud,
    });

    expect(prisma.reporte.create).toHaveBeenCalledWith({
      data: {
        tipo: 'perdido',
        subtipo: null,
        reportadoPor: 'usuario-1',
        mascotaId: null,
        descripcion: filaReporte.descripcion,
        fotoUrl: filaReporte.fotoUrl,
        latitud: filaReporte.latitud,
        longitud: filaReporte.longitud,
      },
      select: SELECT_REPORTE,
    });
    expect((prisma.reporte.create.mock.calls[0]?.[0] as { data: object }).data).not.toHaveProperty('estado');
    expect(creado.id).toBe('reporte-1');
    expect(creado.estado).toBe('reportado');
    expect(creado.createdAt).toEqual(filaReporte.createdAt);
  });

  it('propaga mascotaId cuando se declara', async () => {
    const mascotaId = '11111111-1111-1111-1111-111111111111';
    prisma.reporte.create.mockResolvedValue({ ...filaReporte, mascotaId });
    const repo = new PrismaReporteRepositorio();

    const creado = await repo.crear({
      tipo: 'perdido',
      subtipo: null,
      reportadoPor: 'usuario-1',
      mascotaId,
      descripcion: filaReporte.descripcion,
      fotoUrl: filaReporte.fotoUrl,
      latitud: filaReporte.latitud,
      longitud: filaReporte.longitud,
    });

    expect(creado.mascotaId).toBe(mascotaId);
  });
});
