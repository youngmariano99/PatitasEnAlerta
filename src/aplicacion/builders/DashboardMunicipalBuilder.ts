import type {
  DashboardMunicipal,
  FiltroZonaDashboard,
  FiltrosMetricasReportes,
  FiltrosMetricasTurnos,
  IRepositorioDashboardMunicipal,
} from '@dominio/puertos/IRepositorioDashboardMunicipal';

/**
 * Builder (GoF, PLANIFICACION.md Sección 4) — arma, paso a paso y de forma
 * fluida, la consulta agregada del dashboard municipal (Historia
 * "Dashboard analítico con mapas de calor") a partir de los filtros que
 * llegan del panel (fecha/zona/tipo de reporte). Cada método `con...()`
 * devuelve `this` para poder encadenar solo los filtros presentes —
 * omitir uno equivale a "sin ese filtro", nunca a un valor por defecto que
 * habría que adivinar en el punto de consumo.
 *
 * `construir()` NO ejecuta la consulta: arma únicamente los objetos
 * `FiltrosMetricasReportes`/`FiltrosMetricasTurnos` (tipados por
 * IRepositorioDashboardMunicipal.ts) que después ObtenerDashboardMunicipal.ts
 * pasa al repositorio — igual que ValidacionReporte.ts separa "armar el
 * comando" de "ejecutarlo". Este builder JAMÁS toca Prisma ni ningún otro
 * detalle de infraestructura: es 100% dominio/aplicación, testeable sin
 * base de datos.
 *
 * Reutiliza SIEMPRE `IRepositorioDashboardMunicipal` (nunca
 * `IRepositorioReportes`/`IRepositorioTurnos`) para ejecutar lo que arma —
 * es la garantía, por tipo, de que la consulta resultante solo puede
 * apoyarse en `mv_metricas_reportes_periodo`/`mv_metricas_turnos_periodo`
 * (AC: "nunca sobre las tablas transaccionales en vivo").
 */
export class DashboardMunicipalBuilder {
  private periodoDesde?: Date;
  private periodoHasta?: Date;
  private tipoReporte?: string;
  private zona?: FiltroZonaDashboard;

  /** Rango de fechas — aplica tanto a las métricas de reportes como a las de turnos. */
  conPeriodo(desde?: Date, hasta?: Date): this {
    this.periodoDesde = desde;
    this.periodoHasta = hasta;
    return this;
  }

  /** Filtra `mv_metricas_reportes_periodo` por `tipo` — sin efecto sobre las métricas de turnos (esa vista no tiene esa dimensión). */
  conTipoReporte(tipo?: string): this {
    this.tipoReporte = tipo;
    return this;
  }

  /** Filtra `mv_metricas_reportes_periodo` por la grilla `zona_lat`/`zona_lng` (mapa de calor) — sin efecto sobre las métricas de turnos. */
  conZona(zona?: FiltroZonaDashboard): this {
    this.zona = zona;
    return this;
  }

  private filtrosReportes(): FiltrosMetricasReportes {
    return { periodoDesde: this.periodoDesde, periodoHasta: this.periodoHasta, tipo: this.tipoReporte, zona: this.zona };
  }

  private filtrosTurnos(): FiltrosMetricasTurnos {
    return { periodoDesde: this.periodoDesde, periodoHasta: this.periodoHasta };
  }

  /**
   * Ejecuta la consulta ya armada contra el repositorio provisto — el único
   * punto de este builder que toca I/O, y solo a través del puerto
   * `IRepositorioDashboardMunicipal` (nunca Prisma directo).
   */
  async construir(repositorio: IRepositorioDashboardMunicipal): Promise<DashboardMunicipal> {
    const [metricasReportes, metricasTurnos] = await Promise.all([
      repositorio.obtenerMetricasReportes(this.filtrosReportes()),
      repositorio.obtenerMetricasTurnos(this.filtrosTurnos()),
    ]);

    return { metricasReportes, metricasTurnos };
  }
}
