/**
 * @jest-environment node
 */
import { PrismaReporteRepositorio } from '@infraestructura/adaptadores/PrismaReporteRepositorio';

const txReporteFindFirstOrThrow = jest.fn();
const txReporteUpdate = jest.fn();
const txHistorialCreate = jest.fn();

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    reporte: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    reporte: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };
};

/** Simula prisma.$transaction ejecutando el callback contra un `tx` fake propio. */
function mockearTransaccion() {
  prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({
      reporte: { findFirstOrThrow: txReporteFindFirstOrThrow, update: txReporteUpdate },
      reporteHistorialEstado: { create: txHistorialCreate },
    }),
  );
}

const SELECT_REPORTE_LISTADO = {
  id: true,
  tipo: true,
  subtipo: true,
  descripcion: true,
  fotoUrl: true,
  latitud: true,
  longitud: true,
  especie: true,
  estado: true,
  createdAt: true,
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
    prisma.reporte.findFirst.mockReset();
    prisma.reporte.count.mockReset();
    prisma.$transaction.mockReset();
    txReporteFindFirstOrThrow.mockReset();
    txReporteUpdate.mockReset();
    txHistorialCreate.mockReset();
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

  describe('listar', () => {
    beforeEach(() => {
      prisma.reporte.findMany.mockResolvedValue([filaReporte]);
      prisma.reporte.count.mockResolvedValue(1);
    });

    it('sin `estado` explícito, filtra por los tres estados activos', async () => {
      const repo = new PrismaReporteRepositorio();

      const pagina = await repo.listar({}, 1, 50);

      const wherePasado = prisma.reporte.findMany.mock.calls[0][0].where;
      expect(wherePasado).toEqual({
        deletedAt: null,
        estado: { in: ['reportado', 'en_revision', 'en_atencion'] },
      });
      expect(prisma.reporte.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' }, skip: 0, take: 50, select: SELECT_REPORTE_LISTADO }),
      );
      expect(prisma.reporte.count).toHaveBeenCalledWith({ where: wherePasado });
      expect(pagina).toEqual({ items: [filaReporte], total: 1, pagina: 1, porPagina: 50 });
    });

    it('un `estado` explícito reemplaza por completo el filtro de activos (incluye resuelto/cerrado)', async () => {
      const repo = new PrismaReporteRepositorio();

      await repo.listar({ estado: 'resuelto' }, 1, 50);

      const wherePasado = prisma.reporte.findMany.mock.calls[0][0].where;
      expect(wherePasado.estado).toBe('resuelto');
    });

    it('combina tipo + estado + zona simultáneamente', async () => {
      const repo = new PrismaReporteRepositorio();

      await repo.listar(
        { tipo: 'perdido', estado: 'reportado', zona: { latitud: -37.9989, longitud: -61.3565, radioKm: 5 } },
        1,
        50,
      );

      const wherePasado = prisma.reporte.findMany.mock.calls[0][0].where;
      expect(wherePasado).toMatchObject({
        deletedAt: null,
        estado: 'reportado',
        tipo: 'perdido',
        latitud: { gte: expect.any(Number), lte: expect.any(Number) },
        longitud: { gte: expect.any(Number), lte: expect.any(Number) },
      });
    });

    it('pagina 2 con porPagina 20 pide skip=20, take=20', async () => {
      const repo = new PrismaReporteRepositorio();

      await repo.listar({}, 2, 20);

      expect(prisma.reporte.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }));
    });

    it('nunca selecciona `reportadoPor` (proyección pública)', async () => {
      const repo = new PrismaReporteRepositorio();

      await repo.listar({}, 1, 50);

      const selectPasado = prisma.reporte.findMany.mock.calls[0][0].select;
      expect(selectPasado).not.toHaveProperty('reportadoPor');
      expect(selectPasado).not.toHaveProperty('mascotaId');
    });

    it('combina tipo + estado + rango de fechas simultáneamente (Panel municipal)', async () => {
      const repo = new PrismaReporteRepositorio();
      const fechaDesde = new Date('2026-07-01T00:00:00.000Z');
      const fechaHasta = new Date('2026-07-31T23:59:59.999Z');

      await repo.listar({ tipo: 'problematica', estado: 'en_atencion', fechaDesde, fechaHasta }, 1, 50);

      const wherePasado = prisma.reporte.findMany.mock.calls[0][0].where;
      expect(wherePasado).toEqual({
        deletedAt: null,
        estado: 'en_atencion',
        tipo: 'problematica',
        createdAt: { gte: fechaDesde, lte: fechaHasta },
      });
    });

    it('con un solo extremo del rango (solo fechaDesde), igual arma el filtro createdAt', async () => {
      const repo = new PrismaReporteRepositorio();
      const fechaDesde = new Date('2026-07-01T00:00:00.000Z');

      await repo.listar({ fechaDesde }, 1, 50);

      const wherePasado = prisma.reporte.findMany.mock.calls[0][0].where;
      expect(wherePasado.createdAt).toEqual({ gte: fechaDesde, lte: undefined });
    });

    it('sin rango de fechas, no agrega la clave createdAt al WHERE', async () => {
      const repo = new PrismaReporteRepositorio();

      await repo.listar({}, 1, 50);

      const wherePasado = prisma.reporte.findMany.mock.calls[0][0].where;
      expect(wherePasado).not.toHaveProperty('createdAt');
    });
  });

  describe('obtenerEstadoActual', () => {
    it('devuelve el estado cuando el reporte existe y no está soft-deleted', async () => {
      prisma.reporte.findFirst.mockResolvedValue({ estado: 'en_revision' });
      const repo = new PrismaReporteRepositorio();

      const estado = await repo.obtenerEstadoActual('reporte-1');

      expect(prisma.reporte.findFirst).toHaveBeenCalledWith({
        where: { id: 'reporte-1', deletedAt: null },
        select: { estado: true },
      });
      expect(estado).toBe('en_revision');
    });

    it('devuelve null si no existe o está soft-deleted', async () => {
      prisma.reporte.findFirst.mockResolvedValue(null);
      const repo = new PrismaReporteRepositorio();

      await expect(repo.obtenerEstadoActual('reporte-inexistente')).resolves.toBeNull();
    });
  });

  describe('actualizarEstado', () => {
    it('actualiza el reporte e inserta el historial en la misma transacción', async () => {
      mockearTransaccion();
      txReporteFindFirstOrThrow.mockResolvedValue({ estado: 'reportado' });
      const repo = new PrismaReporteRepositorio();

      const resultado = await repo.actualizarEstado('reporte-1', 'en_revision', 'municipio-1');

      expect(txReporteUpdate).toHaveBeenCalledWith({ where: { id: 'reporte-1' }, data: { estado: 'en_revision' } });
      expect(txHistorialCreate).toHaveBeenCalledWith({
        data: { reporteId: 'reporte-1', estadoAnterior: 'reportado', estadoNuevo: 'en_revision', usuarioId: 'municipio-1' },
      });
      expect(resultado).toEqual({ id: 'reporte-1', estado: 'en_revision', estadoAnterior: 'reportado' });
    });

    it('re-lee el estado adentro de la transacción (no confía en un valor ya validado afuera)', async () => {
      mockearTransaccion();
      txReporteFindFirstOrThrow.mockResolvedValue({ estado: 'en_atencion' });
      const repo = new PrismaReporteRepositorio();

      await repo.actualizarEstado('reporte-1', 'resuelto', 'municipio-1');

      expect(txReporteFindFirstOrThrow).toHaveBeenCalledWith({
        where: { id: 'reporte-1', deletedAt: null },
        select: { estado: true },
      });
    });
  });
});
