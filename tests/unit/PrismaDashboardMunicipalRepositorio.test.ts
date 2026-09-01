/**
 * @jest-environment node
 */
import { PrismaDashboardMunicipalRepositorio } from '@infraestructura/adaptadores/PrismaDashboardMunicipalRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    metricaReportePeriodo: { findMany: jest.fn() },
    metricaTurnoPeriodo: { findMany: jest.fn() },
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    metricaReportePeriodo: { findMany: jest.Mock };
    metricaTurnoPeriodo: { findMany: jest.Mock };
  };
};

describe('PrismaDashboardMunicipalRepositorio', () => {
  beforeEach(() => {
    prisma.metricaReportePeriodo.findMany.mockReset().mockResolvedValue([]);
    prisma.metricaTurnoPeriodo.findMany.mockReset().mockResolvedValue([]);
  });

  describe('obtenerMetricasReportes', () => {
    it('sin filtros, consulta sin condición de período/tipo/zona', async () => {
      const adapter = new PrismaDashboardMunicipalRepositorio();

      await adapter.obtenerMetricasReportes({});

      expect(prisma.metricaReportePeriodo.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { periodo: 'asc' },
      });
    });

    it('aplica el rango de período cuando se declara periodoDesde/periodoHasta', async () => {
      const adapter = new PrismaDashboardMunicipalRepositorio();
      const desde = new Date('2026-08-01T00:00:00.000Z');
      const hasta = new Date('2026-08-31T00:00:00.000Z');

      await adapter.obtenerMetricasReportes({ periodoDesde: desde, periodoHasta: hasta });

      expect(prisma.metricaReportePeriodo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ periodo: { gte: desde, lte: hasta } }) }),
      );
    });

    it('aplica el filtro de tipo cuando se declara', async () => {
      const adapter = new PrismaDashboardMunicipalRepositorio();

      await adapter.obtenerMetricasReportes({ tipo: 'perdido' });

      expect(prisma.metricaReportePeriodo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tipo: 'perdido' }) }),
      );
    });

    it('convierte el filtro de zona (centro + radio) en un rango de zonaLat/zonaLng', async () => {
      const adapter = new PrismaDashboardMunicipalRepositorio();

      await adapter.obtenerMetricasReportes({ zona: { latitud: -37.9989, longitud: -61.3565, radioKm: 5 } });

      const [{ where }] = prisma.metricaReportePeriodo.findMany.mock.calls[0]!;
      expect(where.zonaLat.gte).toBeLessThan(-37.9989);
      expect(where.zonaLat.lte).toBeGreaterThan(-37.9989);
      expect(where.zonaLng.gte).toBeLessThan(-61.3565);
      expect(where.zonaLng.lte).toBeGreaterThan(-61.3565);
    });
  });

  describe('obtenerMetricasTurnos', () => {
    it('sin filtros, consulta sin condición de período', async () => {
      const adapter = new PrismaDashboardMunicipalRepositorio();

      await adapter.obtenerMetricasTurnos({});

      expect(prisma.metricaTurnoPeriodo.findMany).toHaveBeenCalledWith({ where: {}, orderBy: { periodo: 'asc' } });
    });

    it('aplica el rango de período cuando se declara', async () => {
      const adapter = new PrismaDashboardMunicipalRepositorio();
      const desde = new Date('2026-08-01T00:00:00.000Z');

      await adapter.obtenerMetricasTurnos({ periodoDesde: desde });

      expect(prisma.metricaTurnoPeriodo.findMany).toHaveBeenCalledWith({
        where: { periodo: { gte: desde, lte: undefined } },
        orderBy: { periodo: 'asc' },
      });
    });
  });
});
