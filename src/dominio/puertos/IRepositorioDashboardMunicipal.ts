/** Filtro geográfico por grilla — ver `zona_lat`/`zona_lng` en docs/SCHEMA.md (mv_metricas_reportes_periodo). */
export interface FiltroZonaDashboard {
  latitud: number;
  longitud: number;
  radioKm: number;
}

export interface FiltrosMetricasReportes {
  periodoDesde?: Date;
  periodoHasta?: Date;
  tipo?: string;
  zona?: FiltroZonaDashboard;
}

export interface FiltrosMetricasTurnos {
  periodoDesde?: Date;
  periodoHasta?: Date;
}

/** Una fila ya agregada de `mv_metricas_reportes_periodo` — nunca un reporte individual. */
export interface MetricaReportePeriodo {
  periodo: Date;
  tipo: string;
  estado: string;
  zonaLat: number;
  zonaLng: number;
  total: number;
}

/** Una fila ya agregada de `mv_metricas_turnos_periodo` — nunca un turno individual. */
export interface MetricaTurnoPeriodo {
  periodo: Date;
  proveedorTipo: string;
  estado: string;
  total: number;
}

export interface DashboardMunicipal {
  metricasReportes: MetricaReportePeriodo[];
  metricasTurnos: MetricaTurnoPeriodo[];
}

/**
 * Puerto hacia las vistas materializadas del dashboard municipal (Módulo 3,
 * "Dashboard analítico con mapas de calor"). A propósito, la única forma de
 * pedir datos acá es a través de `FiltrosMetricasReportes`/
 * `FiltrosMetricasTurnos` — no existe (ni debe agregarse nunca) un método
 * que consulte `reportes`/`turnos` en vivo desde este puerto: esa es la
 * garantía estructural, no solo documental, de la AC "nunca sobre las
 * tablas transaccionales en vivo" — ObtenerDashboardMunicipal.ts ni siquiera
 * puede inyectar `IRepositorioReportes`/`IRepositorioTurnos` sin dejar de
 * depender exclusivamente de este puerto.
 */
export interface IRepositorioDashboardMunicipal {
  obtenerMetricasReportes(filtros: FiltrosMetricasReportes): Promise<MetricaReportePeriodo[]>;
  obtenerMetricasTurnos(filtros: FiltrosMetricasTurnos): Promise<MetricaTurnoPeriodo[]>;
}
