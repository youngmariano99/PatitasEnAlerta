import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  FiltroZonaDashboard,
  FiltrosMetricasReportes,
  FiltrosMetricasTurnos,
  IRepositorioDashboardMunicipal,
  MetricaReportePeriodo,
  MetricaTurnoPeriodo,
} from '@dominio/puertos/IRepositorioDashboardMunicipal';

// Mismo criterio que PrismaReporteRepositorio.calcularRangoGeografico: acá
// se aplica sobre `zona_lat`/`zona_lng` (la grilla ya agregada de
// mv_metricas_reportes_periodo) en vez de `latitud`/`longitud` de un reporte
// individual — nunca se vuelve a tocar la tabla `reportes`.
const KM_POR_GRADO_LATITUD = 111;

function calcularRangoZona(zona: FiltroZonaDashboard) {
  const deltaLatitud = zona.radioKm / KM_POR_GRADO_LATITUD;
  const kmPorGradoLongitud = KM_POR_GRADO_LATITUD * Math.cos((zona.latitud * Math.PI) / 180);
  const deltaLongitud = kmPorGradoLongitud > 0.001 ? zona.radioKm / kmPorGradoLongitud : 1;

  return {
    zonaLat: { gte: zona.latitud - deltaLatitud, lte: zona.latitud + deltaLatitud },
    zonaLng: { gte: zona.longitud - deltaLongitud, lte: zona.longitud + deltaLongitud },
  };
}

function rangoPeriodo(desde?: Date, hasta?: Date) {
  return desde || hasta ? { periodo: { gte: desde, lte: hasta } } : {};
}

/**
 * Adapter (patrón Adapter) sobre las vistas materializadas del dashboard.
 * `prisma.metricaReportePeriodo`/`prisma.metricaTurnoPeriodo` apuntan a
 * `mv_metricas_reportes_periodo`/`mv_metricas_turnos_periodo`
 * (`@@map`, schema.prisma) — Prisma las trata como tablas de solo lectura;
 * este repositorio nunca hace `create`/`update`/`delete` sobre ellas, el
 * único mecanismo de escritura es `REFRESH MATERIALIZED VIEW`
 * (supabase/functions/refresh-metricas-dashboard/, fuera del ciclo de
 * request — Paso 2 del ticket).
 */
@injectable()
export class PrismaDashboardMunicipalRepositorio implements IRepositorioDashboardMunicipal {
  async obtenerMetricasReportes(filtros: FiltrosMetricasReportes): Promise<MetricaReportePeriodo[]> {
    return prisma.metricaReportePeriodo.findMany({
      where: {
        ...rangoPeriodo(filtros.periodoDesde, filtros.periodoHasta),
        ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
        ...(filtros.zona ? calcularRangoZona(filtros.zona) : {}),
      },
      orderBy: { periodo: 'asc' },
    });
  }

  async obtenerMetricasTurnos(filtros: FiltrosMetricasTurnos): Promise<MetricaTurnoPeriodo[]> {
    return prisma.metricaTurnoPeriodo.findMany({
      where: rangoPeriodo(filtros.periodoDesde, filtros.periodoHasta),
      orderBy: { periodo: 'asc' },
    });
  }
}
