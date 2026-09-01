/**
 * @jest-environment node
 */
import { ObtenerDashboardMunicipal } from '@aplicacion/casos-de-uso/municipio/ObtenerDashboardMunicipal';
import type { IRepositorioDashboardMunicipal, MetricaReportePeriodo, MetricaTurnoPeriodo } from '@dominio/puertos/IRepositorioDashboardMunicipal';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';

const municipioId = '11111111-1111-1111-1111-111111111111';

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

describe('ObtenerDashboardMunicipal', () => {
  it('devuelve las métricas serializadas (periodo como ISO string)', async () => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes();
    const caso = new ObtenerDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    const resultado = await caso.ejecutar({ municipioId });

    expect(resultado.metricasReportes).toEqual([{ ...metricaReporte, periodo: metricaReporte.periodo.toISOString() }]);
    expect(resultado.metricasTurnos).toEqual([{ ...metricaTurno, periodo: metricaTurno.periodo.toISOString() }]);
  });

  it('propaga los filtros de zona solo cuando los tres campos están presentes', async () => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes();
    const caso = new ObtenerDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    await caso.ejecutar({ municipioId, latitud: -37.9989, longitud: -61.3565, radioKm: 5 });

    expect(repositorioDashboard.obtenerMetricasReportes).toHaveBeenCalledWith(
      expect.objectContaining({ zona: { latitud: -37.9989, longitud: -61.3565, radioKm: 5 } }),
    );
  });

  it('ignora una zona parcial (solo latitud, sin longitud/radioKm)', async () => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes();
    const caso = new ObtenerDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    await caso.ejecutar({ municipioId, latitud: -37.9989 });

    expect(repositorioDashboard.obtenerMetricasReportes).toHaveBeenCalledWith(expect.objectContaining({ zona: undefined }));
  });

  it('permite la consulta también para rol administrador', async () => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes({ rol: 'administrador' });
    const caso = new ObtenerDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    await expect(caso.ejecutar({ municipioId })).resolves.toBeDefined();
  });

  it.each(['dueño', 'veterinario'])('rechaza con PEA-MUN-005 (403) para rol %s, sin consultar las vistas materializadas', async (rol) => {
    const { repositorioDashboard, repositorioPerfil } = crearFakes({ rol });
    const caso = new ObtenerDashboardMunicipal(repositorioDashboard, repositorioPerfil);

    await expect(caso.ejecutar({ municipioId })).rejects.toBeInstanceOf(SoloMunicipioAdministraEventosError);
    expect(repositorioDashboard.obtenerMetricasReportes).not.toHaveBeenCalled();
    expect(repositorioDashboard.obtenerMetricasTurnos).not.toHaveBeenCalled();
  });

  it('AC: la consulta nunca depende de un puerto sobre tablas transaccionales — el caso de uso solo recibe IRepositorioDashboardMunicipal', () => {
    // Verificación por firma: el constructor de ObtenerDashboardMunicipal
    // tiene exactamente 2 parámetros (repositorio del dashboard + perfil) —
    // no hay forma de inyectarle IRepositorioReportes/IRepositorioTurnos sin
    // cambiar esta firma, lo que estructuralmente impide consultar las
    // tablas en vivo desde acá.
    expect(ObtenerDashboardMunicipal.length).toBe(2);
  });
});
