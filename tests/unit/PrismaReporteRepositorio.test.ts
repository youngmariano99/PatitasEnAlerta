/**
 * @jest-environment node
 */
import { PrismaReporteRepositorio } from '@infraestructura/adaptadores/PrismaReporteRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    reporte: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: { reporte: { create: jest.Mock; findMany: jest.Mock } };
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
  especie: true,
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
  especie: 'perro',
  estado: 'reportado',
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
};

describe('PrismaReporteRepositorio', () => {
  beforeEach(() => {
    prisma.reporte.create.mockReset();
    prisma.reporte.findMany.mockReset();
  });

  describe('crear', () => {
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
        especie: 'perro',
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
          especie: 'perro',
        },
        select: SELECT_REPORTE,
      });
      expect((prisma.reporte.create.mock.calls[0]?.[0] as { data: object }).data).not.toHaveProperty('estado');
      expect(creado.id).toBe('reporte-1');
      expect(creado.estado).toBe('reportado');
      expect(creado.especie).toBe('perro');
      expect(creado.createdAt).toEqual(filaReporte.createdAt);
    });

    it('propaga mascotaId y especie=null cuando no se declaran', async () => {
      prisma.reporte.create.mockResolvedValue({ ...filaReporte, especie: null });
      const repo = new PrismaReporteRepositorio();

      const creado = await repo.crear({
        tipo: 'encontrado',
        subtipo: null,
        reportadoPor: 'usuario-1',
        mascotaId: null,
        descripcion: filaReporte.descripcion,
        fotoUrl: filaReporte.fotoUrl,
        latitud: filaReporte.latitud,
        longitud: filaReporte.longitud,
        especie: null,
      });

      expect(creado.mascotaId).toBeNull();
      expect(creado.especie).toBeNull();
    });
  });

  describe('buscarPerdidosActivosPorZonaYEspecie', () => {
    it('filtra por tipo=perdido, estados activos, especie (insensitive), radio geográfico y excluye el propio id', async () => {
      prisma.reporte.findMany.mockResolvedValue([{ id: 'perdido-1', reportadoPor: 'dueno-1' }]);
      const repo = new PrismaReporteRepositorio();

      const resultado = await repo.buscarPerdidosActivosPorZonaYEspecie({
        especie: 'Perro',
        latitud: -37.9989,
        longitud: -61.3565,
        radioKm: 5,
        excluirReporteId: 'reporte-encontrado-1',
      });

      expect(prisma.reporte.findMany).toHaveBeenCalledWith({
        where: {
          tipo: 'perdido',
          estado: { in: ['reportado', 'en_revision', 'en_atencion'] },
          especie: { equals: 'Perro', mode: 'insensitive' },
          latitud: { gte: expect.any(Number), lte: expect.any(Number) },
          longitud: { gte: expect.any(Number), lte: expect.any(Number) },
          id: { not: 'reporte-encontrado-1' },
          deletedAt: null,
        },
        select: { id: true, reportadoPor: true },
      });
      expect(resultado).toEqual([{ id: 'perdido-1', reportadoPor: 'dueno-1' }]);
    });

    it('devuelve [] cuando no hay coincidencias', async () => {
      prisma.reporte.findMany.mockResolvedValue([]);
      const repo = new PrismaReporteRepositorio();

      const resultado = await repo.buscarPerdidosActivosPorZonaYEspecie({
        especie: 'gato',
        latitud: -37.9989,
        longitud: -61.3565,
        radioKm: 5,
        excluirReporteId: 'reporte-1',
      });

      expect(resultado).toEqual([]);
    });
  });
});
