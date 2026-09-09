/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ListarHistorialColaboracion } from '@aplicacion/casos-de-uso/red-colaboracion/ListarHistorialColaboracion';
import type { ColaboracionActual, HistorialEstadoColaboracionItem, IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { ColaboracionNoEncontradaError } from '@dominio/errores/erroresRedColaboracion';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const colaboracionId = '11111111-1111-1111-1111-111111111111';
const organizacionId = '22222222-2222-2222-2222-222222222222';
const stakeholderId = '33333333-3333-3333-3333-333333333333';
const ajenoId = '44444444-4444-4444-4444-444444444444';

const HISTORIAL: HistorialEstadoColaboracionItem[] = [
  { id: 'h1', estadoAnterior: 'propuesta', estadoNuevo: 'aceptada', usuarioId: organizacionId, registradoEn: new Date('2026-09-01T10:00:00.000Z') },
  { id: 'h2', estadoAnterior: 'aceptada', estadoNuevo: 'completada', usuarioId: organizacionId, registradoEn: new Date('2026-09-02T10:00:00.000Z') },
];

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: ajenoId, email: 'usuario@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { actual?: ColaboracionActual | null; rolSolicitante?: string }) {
  const actual: ColaboracionActual | null =
    opciones && 'actual' in opciones ? opciones.actual! : { estado: 'aceptada', organizacionId, stakeholderId };

  const repositorioColaboraciones: jest.Mocked<IRepositorioColaboraciones> = {
    obtenerActual: jest.fn().mockResolvedValue(actual),
    actualizarEstado: jest.fn(),
    listarHistorialEstado: jest.fn().mockResolvedValue(HISTORIAL),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rolSolicitante ?? 'dueño')),
  };
  return { repositorioColaboraciones, repositorioPerfil };
}

describe('ListarHistorialColaboracion', () => {
  it('la organización dueña de la solicitud accede a su propio historial, ordenado cronológicamente', async () => {
    const { repositorioColaboraciones, repositorioPerfil } = crearFakes({ actual: { estado: 'aceptada', organizacionId, stakeholderId } });
    const caso = new ListarHistorialColaboracion(repositorioColaboraciones, repositorioPerfil);

    const resultado = await caso.ejecutar({ colaboracionId, solicitanteId: organizacionId });

    expect(resultado).toEqual(HISTORIAL);
    expect(repositorioColaboraciones.listarHistorialEstado).toHaveBeenCalledWith(colaboracionId);
    expect(repositorioPerfil.obtenerPerfilPropio).not.toHaveBeenCalled();
  });

  it('el stakeholder que propuso la colaboración también accede a su historial', async () => {
    const { repositorioColaboraciones, repositorioPerfil } = crearFakes({ actual: { estado: 'aceptada', organizacionId, stakeholderId } });
    const caso = new ListarHistorialColaboracion(repositorioColaboraciones, repositorioPerfil);

    const resultado = await caso.ejecutar({ colaboracionId, solicitanteId: stakeholderId });

    expect(resultado).toEqual(HISTORIAL);
    expect(repositorioPerfil.obtenerPerfilPropio).not.toHaveBeenCalled();
  });

  it('administrador accede al historial de cualquier colaboración, aunque no sea parte de ella', async () => {
    const { repositorioColaboraciones, repositorioPerfil } = crearFakes({
      actual: { estado: 'aceptada', organizacionId, stakeholderId },
      rolSolicitante: 'administrador',
    });
    const caso = new ListarHistorialColaboracion(repositorioColaboraciones, repositorioPerfil);

    const resultado = await caso.ejecutar({ colaboracionId, solicitanteId: ajenoId });

    expect(resultado).toEqual(HISTORIAL);
  });

  it.each(['dueño', 'veterinario', 'municipio'])('rechaza con PEA-SIS-002 (403) a un usuario %s ajeno a la colaboración', async (rol) => {
    const { repositorioColaboraciones, repositorioPerfil } = crearFakes({
      actual: { estado: 'aceptada', organizacionId, stakeholderId },
      rolSolicitante: rol,
    });
    const caso = new ListarHistorialColaboracion(repositorioColaboraciones, repositorioPerfil);

    await expect(caso.ejecutar({ colaboracionId, solicitanteId: ajenoId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioColaboraciones.listarHistorialEstado).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-RED-005 (404) si la colaboración no existe o está soft-deleted', async () => {
    const { repositorioColaboraciones, repositorioPerfil } = crearFakes({ actual: null });
    const caso = new ListarHistorialColaboracion(repositorioColaboraciones, repositorioPerfil);

    await expect(caso.ejecutar({ colaboracionId, solicitanteId: organizacionId })).rejects.toBeInstanceOf(
      ColaboracionNoEncontradaError,
    );
    expect(repositorioColaboraciones.listarHistorialEstado).not.toHaveBeenCalled();
    expect(repositorioPerfil.obtenerPerfilPropio).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast un colaboracionId que no es un UUID válido', async () => {
    const { repositorioColaboraciones, repositorioPerfil } = crearFakes();
    const caso = new ListarHistorialColaboracion(repositorioColaboraciones, repositorioPerfil);

    await expect(caso.ejecutar({ colaboracionId: 'no-es-uuid', solicitanteId: organizacionId })).rejects.toBeInstanceOf(ZodError);
  });
});
