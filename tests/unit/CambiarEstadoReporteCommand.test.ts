/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { CambiarEstadoReporteCommand } from '@aplicacion/casos-de-uso/reportes/CambiarEstadoReporteCommand';
import type { IRepositorioReportes, ReporteEstadoActualizado } from '@dominio/puertos/IRepositorioReportes';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import {
  CambioDeEstadoInvalidoError,
  ReporteNoEncontradoError,
  SoloMunicipioActualizaEstadoError,
} from '@dominio/errores/erroresReportes';
import { logger } from '@infraestructura/logging/logger';

jest.mock('@infraestructura/logging/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

const reporteId = '11111111-1111-1111-1111-111111111111';
const solicitanteId = '22222222-2222-2222-2222-222222222222';

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: solicitanteId, email: 'municipio@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string; estadoActual?: string | null }) {
  // `?? 'reportado'` trataría `null` (soft-deleted/no encontrado) como
  // "sin declarar" — por eso el chequeo explícito de `undefined` acá.
  const estadoActual = opciones && 'estadoActual' in opciones ? opciones.estadoActual : 'reportado';
  const repositorioReportes: jest.Mocked<IRepositorioReportes> = {
    crear: jest.fn(),
    buscarPerdidosActivosPorZonaYEspecie: jest.fn(),
    listar: jest.fn(),
    obtenerEstadoActual: jest.fn().mockResolvedValue(estadoActual),
    actualizarEstado: jest.fn().mockImplementation(async (id: string, estadoNuevo: string) => ({
      id,
      estado: estadoNuevo,
      estadoAnterior: estadoActual,
    })),
    obtenerPropietario: jest.fn(),
    listarHistorialEstado: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'municipio')),
  };
  return { repositorioReportes, repositorioPerfil };
}

describe('CambiarEstadoReporteCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cambia el estado, registra el historial vía el repositorio y publica el evento ReporteActualizado, para rol municipio', async () => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ estadoActual: 'reportado' });
    const caso = new CambiarEstadoReporteCommand(repositorioReportes, repositorioPerfil);

    const resultado = await caso.ejecutar({ reporteId, estadoNuevo: 'en_revision', solicitanteId });

    expect(repositorioReportes.actualizarEstado).toHaveBeenCalledWith(reporteId, 'en_revision', solicitanteId);
    expect(resultado).toEqual<ReporteEstadoActualizado>({ id: reporteId, estado: 'en_revision', estadoAnterior: 'reportado' });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        evento: 'ReporteActualizado',
        reporteId,
        estadoAnterior: 'reportado',
        estadoNuevo: 'en_revision',
      }),
      expect.any(String),
    );
  });

  it('permite la transición también para rol administrador', async () => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ rol: 'administrador', estadoActual: 'en_revision' });
    const caso = new CambiarEstadoReporteCommand(repositorioReportes, repositorioPerfil);

    await expect(caso.ejecutar({ reporteId, estadoNuevo: 'en_atencion', solicitanteId })).resolves.toMatchObject({
      estado: 'en_atencion',
    });
  });

  it.each(['dueño', 'veterinario'])('rechaza con PEA-REP-007 (403) para rol %s, sin tocar el repositorio', async (rol) => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ rol });
    const caso = new CambiarEstadoReporteCommand(repositorioReportes, repositorioPerfil);

    await expect(caso.ejecutar({ reporteId, estadoNuevo: 'en_revision', solicitanteId })).rejects.toBeInstanceOf(
      SoloMunicipioActualizaEstadoError,
    );
    expect(repositorioReportes.obtenerEstadoActual).not.toHaveBeenCalled();
    expect(repositorioReportes.actualizarEstado).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-REP-005 (404) si el reporte no existe o está soft-deleted', async () => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ estadoActual: null });
    const caso = new CambiarEstadoReporteCommand(repositorioReportes, repositorioPerfil);

    await expect(caso.ejecutar({ reporteId, estadoNuevo: 'en_revision', solicitanteId })).rejects.toBeInstanceOf(
      ReporteNoEncontradoError,
    );
    expect(repositorioReportes.actualizarEstado).not.toHaveBeenCalled();
  });

  it.each([
    ['reportado', 'resuelto'],
    ['reportado', 'en_atencion'],
    ['reportado', 'cerrado'],
    ['cerrado', 'reportado'],
    ['resuelto', 'en_revision'],
    ['en_revision', 'resuelto'],
    ['en_revision', 'cerrado'],
    ['en_atencion', 'cerrado'],
  ])('rechaza con PEA-REP-006 (409) la transición inválida %s → %s', async (estadoActual, estadoNuevo) => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ estadoActual });
    const caso = new CambiarEstadoReporteCommand(repositorioReportes, repositorioPerfil);

    await expect(
      caso.ejecutar({ reporteId, estadoNuevo: estadoNuevo as never, solicitanteId }),
    ).rejects.toBeInstanceOf(CambioDeEstadoInvalidoError);
    expect(repositorioReportes.actualizarEstado).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-REP-006 (409) el intento de saltar directamente de "reportado" a "cerrado"', async () => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ estadoActual: 'reportado' });
    const caso = new CambiarEstadoReporteCommand(repositorioReportes, repositorioPerfil);

    await expect(caso.ejecutar({ reporteId, estadoNuevo: 'cerrado', solicitanteId })).rejects.toBeInstanceOf(
      CambioDeEstadoInvalidoError,
    );
    expect(repositorioReportes.actualizarEstado).not.toHaveBeenCalled();
  });

  it.each([
    ['reportado', 'en_revision'],
    ['en_revision', 'en_atencion'],
    ['en_atencion', 'resuelto'],
    ['resuelto', 'cerrado'],
  ])('acepta la transición válida %s → %s', async (estadoActual, estadoNuevo) => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ estadoActual });
    const caso = new CambiarEstadoReporteCommand(repositorioReportes, repositorioPerfil);

    await expect(
      caso.ejecutar({ reporteId, estadoNuevo: estadoNuevo as never, solicitanteId }),
    ).resolves.toMatchObject({ estado: estadoNuevo });
  });

  it('"cerrado" es terminal: ninguna transición sale de ahí', async () => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ estadoActual: 'cerrado' });
    const caso = new CambiarEstadoReporteCommand(repositorioReportes, repositorioPerfil);

    await expect(caso.ejecutar({ reporteId, estadoNuevo: 'resuelto', solicitanteId })).rejects.toBeInstanceOf(
      CambioDeEstadoInvalidoError,
    );
  });

  it('rechaza fail-fast un estadoNuevo fuera del catálogo', async () => {
    const { repositorioReportes, repositorioPerfil } = crearFakes();
    const caso = new CambiarEstadoReporteCommand(repositorioReportes, repositorioPerfil);

    await expect(
      caso.ejecutar({ reporteId, estadoNuevo: 'no_existe' as never, solicitanteId }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
