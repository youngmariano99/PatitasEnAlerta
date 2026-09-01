/**
 * @jest-environment node
 */
import { ExportarDashboardMunicipal } from '@aplicacion/casos-de-uso/municipio/ExportarDashboardMunicipal';
import type { IRepositorioDashboardMunicipal, MetricaReportePeriodo, MetricaTurnoPeriodo } from '@dominio/puertos/IRepositorioDashboardMunicipal';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { RangoFechasInvalidoExportacionError, SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';

const municipioId = '11111111-1111-1111-1111-111111111111';

const metricaReporte: MetricaReportePeriodo = {
  periodo: new Date('2026-08-03T00:00:00.000Z'),
  tipo: 'perdido',
  estado: 'reportado',
  zonaLat: -37.99,
  zonaLng: -61.35,
  total: 5,
};

const metricaTurno: MetricaTurnoPeriodo = {
  periodo: new Date('2026-08-03T00:00:00.000Z'),
  proveedorTipo: 'municipio',
  estado: 'disponible',
  total: 8,
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: municipioId, email: 'municipio@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string }) {
  const repositorioDashboard: jest.Mocked<IRepositorioDashboardMunicipal> = {
    obtenerMetricasReportes: jest.fn().mockResolvedValue([metricaReporte]),
    obtenerMetricasTurnos: jest.fn().mockResolvedValue([metricaTurno]),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'municipio')),
  };
  return { repositorioDashboard, repositorioPerfil };
}

const rangoValido = { periodoDesde: '2026-08-01T00:00:00.000Z', periodoHasta: '2026-08-31T00:00:00.000Z' };

describe('ExportarDashboardMunicipal', () => {
  it('genera un csv con las métricas del rango y un nombre de archivo con la fecha de generación', async () => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes();
    const caso = new ExportarDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    const resultado = await caso.ejecutar({ datosCrudos: rangoValido, municipioId });

    expect(resultado.csv).toContain('# Métricas de reportes');
    expect(resultado.csv).toContain('perdido');
    expect(resultado.csv).toContain('# Métricas de turnos');
    expect(resultado.csv).toContain('municipio');
    const hoy = new Date().toISOString().slice(0, 10);
    expect(resultado.nombreArchivo).toBe(`resumen-actividad-municipal-${hoy}.csv`);
  });

  it('arma la consulta con el mismo Builder que ObtenerDashboardMunicipal (mismos datos que en pantalla)', async () => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes();
    const caso = new ExportarDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    await caso.ejecutar({ datosCrudos: rangoValido, municipioId });

    expect(repositorioDashboard.obtenerMetricasReportes).toHaveBeenCalledWith(
      expect.objectContaining({
        periodoDesde: new Date(rangoValido.periodoDesde),
        periodoHasta: new Date(rangoValido.periodoHasta),
      }),
    );
    expect(repositorioDashboard.obtenerMetricasTurnos).toHaveBeenCalledWith({
      periodoDesde: new Date(rangoValido.periodoDesde),
      periodoHasta: new Date(rangoValido.periodoHasta),
    });
  });

  it('permite la exportación también para rol administrador', async () => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes({ rol: 'administrador' });
    const caso = new ExportarDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: rangoValido, municipioId })).resolves.toBeDefined();
  });

  it.each(['dueño', 'veterinario'])('rechaza con PEA-MUN-005 (403) para rol %s, sin consultar las vistas materializadas', async (rol) => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes({ rol });
    const caso = new ExportarDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: rangoValido, municipioId })).rejects.toBeInstanceOf(
      SoloMunicipioAdministraEventosError,
    );
    expect(repositorioDashboard.obtenerMetricasReportes).not.toHaveBeenCalled();
  });

  it('AC: rechaza con PEA-MUN-007 (400) cuando periodoHasta es anterior a periodoDesde', async () => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes();
    const caso = new ExportarDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    await expect(
      caso.ejecutar({
        datosCrudos: { periodoDesde: '2026-08-31T00:00:00.000Z', periodoHasta: '2026-08-01T00:00:00.000Z' },
        municipioId,
      }),
    ).rejects.toBeInstanceOf(RangoFechasInvalidoExportacionError);
    expect(repositorioDashboard.obtenerMetricasReportes).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-MUN-007 (400) cuando periodoHasta es igual a periodoDesde', async () => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes();
    const caso = new ExportarDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    await expect(
      caso.ejecutar({
        datosCrudos: { periodoDesde: '2026-08-01T00:00:00.000Z', periodoHasta: '2026-08-01T00:00:00.000Z' },
        municipioId,
      }),
    ).rejects.toBeInstanceOf(RangoFechasInvalidoExportacionError);
  });

  it.each(['periodoDesde', 'periodoHasta'])('rechaza con PEA-MUN-007 (400) si falta "%s"', async (campo) => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes();
    const caso = new ExportarDashboardMunicipal(repositorioDashboard, repositorioPerfil);
    const sinCampo = { ...rangoValido };
    delete (sinCampo as Record<string, unknown>)[campo];

    await expect(caso.ejecutar({ datosCrudos: sinCampo, municipioId })).rejects.toBeInstanceOf(
      RangoFechasInvalidoExportacionError,
    );
  });
});
