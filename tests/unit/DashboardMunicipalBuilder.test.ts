/**
 * @jest-environment node
 */
import { DashboardMunicipalBuilder } from '@aplicacion/builders/DashboardMunicipalBuilder';
import type {
  FiltrosMetricasReportes,
  FiltrosMetricasTurnos,
  IRepositorioDashboardMunicipal,
  MetricaReportePeriodo,
  MetricaTurnoPeriodo,
} from '@dominio/puertos/IRepositorioDashboardMunicipal';

function crearRepositorioFalso(opciones?: { reportes?: MetricaReportePeriodo[]; turnos?: MetricaTurnoPeriodo[] }) {
  const repositorio: jest.Mocked<IRepositorioDashboardMunicipal> = {
    obtenerMetricasReportes: jest.fn().mockResolvedValue(opciones?.reportes ?? []),
    obtenerMetricasTurnos: jest.fn().mockResolvedValue(opciones?.turnos ?? []),
  };
  return repositorio;
}

describe('DashboardMunicipalBuilder (Builder)', () => {
  it('sin ningún filtro, arma consultas vacías (sin período/tipo/zona)', async () => {
    const repositorio = crearRepositorioFalso();

    await new DashboardMunicipalBuilder().construir(repositorio);

    expect(repositorio.obtenerMetricasReportes).toHaveBeenCalledWith({
      periodoDesde: undefined,
      periodoHasta: undefined,
      tipo: undefined,
      zona: undefined,
    } satisfies FiltrosMetricasReportes);
    expect(repositorio.obtenerMetricasTurnos).toHaveBeenCalledWith({
      periodoDesde: undefined,
      periodoHasta: undefined,
    } satisfies FiltrosMetricasTurnos);
  });

  it('conPeriodo() se propaga a AMBAS consultas (reportes y turnos)', async () => {
    const repositorio = crearRepositorioFalso();
    const desde = new Date('2026-08-01T00:00:00.000Z');
    const hasta = new Date('2026-08-31T00:00:00.000Z');

    await new DashboardMunicipalBuilder().conPeriodo(desde, hasta).construir(repositorio);

    expect(repositorio.obtenerMetricasReportes).toHaveBeenCalledWith(
      expect.objectContaining({ periodoDesde: desde, periodoHasta: hasta }),
    );
    expect(repositorio.obtenerMetricasTurnos).toHaveBeenCalledWith({ periodoDesde: desde, periodoHasta: hasta });
  });

  it('conTipoReporte() solo afecta la consulta de reportes, nunca la de turnos', async () => {
    const repositorio = crearRepositorioFalso();

    await new DashboardMunicipalBuilder().conTipoReporte('perdido').construir(repositorio);

    expect(repositorio.obtenerMetricasReportes).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'perdido' }));
    expect(repositorio.obtenerMetricasTurnos).toHaveBeenCalledWith({ periodoDesde: undefined, periodoHasta: undefined });
  });

  it('conZona() solo afecta la consulta de reportes, nunca la de turnos', async () => {
    const repositorio = crearRepositorioFalso();
    const zona = { latitud: -37.9989, longitud: -61.3565, radioKm: 5 };

    await new DashboardMunicipalBuilder().conZona(zona).construir(repositorio);

    expect(repositorio.obtenerMetricasReportes).toHaveBeenCalledWith(expect.objectContaining({ zona }));
    expect(repositorio.obtenerMetricasTurnos).toHaveBeenCalledWith({ periodoDesde: undefined, periodoHasta: undefined });
  });

  it('encadena todos los filtros a la vez (fluent API) y arma una única consulta consistente', async () => {
    const repositorio = crearRepositorioFalso();
    const desde = new Date('2026-08-01T00:00:00.000Z');
    const zona = { latitud: -37.9989, longitud: -61.3565, radioKm: 5 };

    await new DashboardMunicipalBuilder()
      .conPeriodo(desde, undefined)
      .conTipoReporte('encontrado')
      .conZona(zona)
      .construir(repositorio);

    expect(repositorio.obtenerMetricasReportes).toHaveBeenCalledWith({
      periodoDesde: desde,
      periodoHasta: undefined,
      tipo: 'encontrado',
      zona,
    });
  });

  it('devuelve exactamente lo que el repositorio resuelve, sin transformarlo', async () => {
    const metricaReporte: MetricaReportePeriodo = {
      periodo: new Date('2026-08-01T00:00:00.000Z'),
      tipo: 'perdido',
      estado: 'reportado',
      zonaLat: -37.99,
      zonaLng: -61.35,
      total: 5,
    };
    const metricaTurno: MetricaTurnoPeriodo = {
      periodo: new Date('2026-08-01T00:00:00.000Z'),
      proveedorTipo: 'municipio',
      estado: 'disponible',
      total: 10,
    };
    const repositorio = crearRepositorioFalso({ reportes: [metricaReporte], turnos: [metricaTurno] });

    const resultado = await new DashboardMunicipalBuilder().construir(repositorio);

    expect(resultado).toEqual({ metricasReportes: [metricaReporte], metricasTurnos: [metricaTurno] });
  });

  it('consulta reportes y turnos en paralelo (Promise.all), no en secuencia', async () => {
    const ordenDeResolucion: string[] = [];
    const repositorio: jest.Mocked<IRepositorioDashboardMunicipal> = {
      obtenerMetricasReportes: jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        ordenDeResolucion.push('reportes');
        return [];
      }),
      obtenerMetricasTurnos: jest.fn().mockImplementation(async () => {
        ordenDeResolucion.push('turnos');
        return [];
      }),
    };

    await new DashboardMunicipalBuilder().construir(repositorio);

    // Si fuera secuencial ("await reportes" y DESPUÉS "await turnos"), 'turnos'
    // jamás podría resolver antes que 'reportes' (que tarda más adrede).
    expect(ordenDeResolucion).toEqual(['turnos', 'reportes']);
  });
});
