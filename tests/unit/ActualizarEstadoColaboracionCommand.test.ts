/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ActualizarEstadoColaboracionCommand } from '@aplicacion/casos-de-uso/red-colaboracion/ActualizarEstadoColaboracionCommand';
import type { ColaboracionActual, ColaboracionEstadoActualizado, IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';
import {
  CambioDeEstadoColaboracionInvalidoError,
  ColaboracionNoEncontradaError,
  SoloOrganizacionActualizaColaboracionError,
} from '@dominio/errores/erroresRedColaboracion';
import { logger } from '@infraestructura/logging/logger';

jest.mock('@infraestructura/logging/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

const colaboracionId = '11111111-1111-1111-1111-111111111111';
const organizacionId = '22222222-2222-2222-2222-222222222222';
const stakeholderId = '33333333-3333-3333-3333-333333333333';
const ajenoId = '44444444-4444-4444-4444-444444444444';

function crearFakes(opciones?: { actual?: ColaboracionActual | null }) {
  const actual: ColaboracionActual | null =
    opciones && 'actual' in opciones ? opciones.actual! : { estado: 'propuesta', organizacionId, stakeholderId };

  const repositorioColaboraciones: jest.Mocked<IRepositorioColaboraciones> = {
    obtenerActual: jest.fn().mockResolvedValue(actual),
    actualizarEstado: jest.fn().mockImplementation(async (id: string, estadoNuevo: string) => ({
      id,
      estado: estadoNuevo,
      estadoAnterior: actual?.estado,
    })),
    listarHistorialEstado: jest.fn(),
  };
  return { repositorioColaboraciones };
}

describe('ActualizarEstadoColaboracionCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cambia el estado, registra el historial vía el repositorio y publica el evento ColaboracionActualizada', async () => {
    const { repositorioColaboraciones } = crearFakes({ actual: { estado: 'propuesta', organizacionId, stakeholderId } });
    const caso = new ActualizarEstadoColaboracionCommand(repositorioColaboraciones);

    const resultado = await caso.ejecutar({ colaboracionId, estadoNuevo: 'aceptada', solicitanteId: organizacionId });

    expect(repositorioColaboraciones.actualizarEstado).toHaveBeenCalledWith(colaboracionId, 'aceptada', organizacionId);
    expect(resultado).toEqual<ColaboracionEstadoActualizado>({ id: colaboracionId, estado: 'aceptada', estadoAnterior: 'propuesta' });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        evento: 'ColaboracionActualizada',
        colaboracionId,
        estadoAnterior: 'propuesta',
        estadoNuevo: 'aceptada',
      }),
      expect.any(String),
    );
  });

  it('permite a la organización dueña completar una colaboración ya aceptada', async () => {
    const { repositorioColaboraciones } = crearFakes({ actual: { estado: 'aceptada', organizacionId, stakeholderId } });
    const caso = new ActualizarEstadoColaboracionCommand(repositorioColaboraciones);

    await expect(
      caso.ejecutar({ colaboracionId, estadoNuevo: 'completada', solicitanteId: organizacionId }),
    ).resolves.toMatchObject({ estado: 'completada' });
  });

  it('rechaza con PEA-RED-004 (403) a un usuario que no es la organización dueña, sin tocar el repositorio de escritura', async () => {
    const { repositorioColaboraciones } = crearFakes({ actual: { estado: 'propuesta', organizacionId, stakeholderId } });
    const caso = new ActualizarEstadoColaboracionCommand(repositorioColaboraciones);

    await expect(caso.ejecutar({ colaboracionId, estadoNuevo: 'aceptada', solicitanteId: ajenoId })).rejects.toBeInstanceOf(
      SoloOrganizacionActualizaColaboracionError,
    );
    expect(repositorioColaboraciones.actualizarEstado).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-RED-004 (403) incluso al propio stakeholder que propuso la colaboración', async () => {
    const { repositorioColaboraciones } = crearFakes({ actual: { estado: 'propuesta', organizacionId, stakeholderId } });
    const caso = new ActualizarEstadoColaboracionCommand(repositorioColaboraciones);

    await expect(
      caso.ejecutar({ colaboracionId, estadoNuevo: 'aceptada', solicitanteId: stakeholderId }),
    ).rejects.toBeInstanceOf(SoloOrganizacionActualizaColaboracionError);
    expect(repositorioColaboraciones.actualizarEstado).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-RED-005 (404) si la colaboración no existe o está soft-deleted', async () => {
    const { repositorioColaboraciones } = crearFakes({ actual: null });
    const caso = new ActualizarEstadoColaboracionCommand(repositorioColaboraciones);

    await expect(
      caso.ejecutar({ colaboracionId, estadoNuevo: 'aceptada', solicitanteId: organizacionId }),
    ).rejects.toBeInstanceOf(ColaboracionNoEncontradaError);
    expect(repositorioColaboraciones.actualizarEstado).not.toHaveBeenCalled();
  });

  it.each([
    ['propuesta', 'completada'],
    ['rechazada', 'aceptada'],
    ['rechazada', 'propuesta'],
    ['completada', 'aceptada'],
    ['completada', 'propuesta'],
    ['aceptada', 'propuesta'],
    ['aceptada', 'rechazada'],
  ])('rechaza con PEA-RED-006 (409) la transición inválida %s → %s', async (estado, estadoNuevo) => {
    const { repositorioColaboraciones } = crearFakes({ actual: { estado, organizacionId, stakeholderId } });
    const caso = new ActualizarEstadoColaboracionCommand(repositorioColaboraciones);

    await expect(
      caso.ejecutar({ colaboracionId, estadoNuevo: estadoNuevo as never, solicitanteId: organizacionId }),
    ).rejects.toBeInstanceOf(CambioDeEstadoColaboracionInvalidoError);
    expect(repositorioColaboraciones.actualizarEstado).not.toHaveBeenCalled();
  });

  it.each([
    ['propuesta', 'aceptada'],
    ['propuesta', 'rechazada'],
    ['aceptada', 'completada'],
  ])('acepta la transición válida %s → %s', async (estado, estadoNuevo) => {
    const { repositorioColaboraciones } = crearFakes({ actual: { estado, organizacionId, stakeholderId } });
    const caso = new ActualizarEstadoColaboracionCommand(repositorioColaboraciones);

    await expect(
      caso.ejecutar({ colaboracionId, estadoNuevo: estadoNuevo as never, solicitanteId: organizacionId }),
    ).resolves.toMatchObject({ estado: estadoNuevo });
  });

  it.each(['rechazada', 'completada'])('"%s" es terminal: ninguna transición sale de ahí', async (estado) => {
    const { repositorioColaboraciones } = crearFakes({ actual: { estado, organizacionId, stakeholderId } });
    const caso = new ActualizarEstadoColaboracionCommand(repositorioColaboraciones);

    await expect(
      caso.ejecutar({ colaboracionId, estadoNuevo: 'propuesta' as never, solicitanteId: organizacionId }),
    ).rejects.toBeInstanceOf(CambioDeEstadoColaboracionInvalidoError);
  });

  it('rechaza fail-fast un estadoNuevo fuera del catálogo', async () => {
    const { repositorioColaboraciones } = crearFakes();
    const caso = new ActualizarEstadoColaboracionCommand(repositorioColaboraciones);

    await expect(
      caso.ejecutar({ colaboracionId, estadoNuevo: 'no_existe' as never, solicitanteId: organizacionId }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
