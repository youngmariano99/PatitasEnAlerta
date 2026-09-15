/**
 * @jest-environment node
 */
import { EditarTemaForo } from '@aplicacion/casos-de-uso/foros-cursos/EditarTemaForo';
import type { IRepositorioTemasForo, TemaForo, TemaForoActual } from '@dominio/puertos/IRepositorioTemasForo';
import { TemaForoModeradoError, TemaForoNoEncontradoError } from '@dominio/errores/erroresForosCursos';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const otroUsuarioId = '55555555-5555-5555-5555-555555555555';
const temaId = '33333333-3333-3333-3333-333333333333';

const datosValidos = { titulo: 'Título editado', contenido: 'Contenido editado' };

function crearTemaActual(opciones?: { creadoPor?: string; moderado?: boolean }): TemaForoActual {
  return { id: temaId, creadoPor: opciones?.creadoPor ?? usuarioId, moderado: opciones?.moderado ?? false };
}

function crearFakes(opciones?: { actual?: TemaForoActual | null }) {
  const temaActualizado: TemaForo = {
    id: temaId,
    creadoPor: usuarioId,
    titulo: datosValidos.titulo,
    contenido: datosValidos.contenido,
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
  };
  const repositorioTemas: jest.Mocked<IRepositorioTemasForo> = {
    crear: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(opciones?.actual === undefined ? crearTemaActual() : opciones.actual),
    actualizar: jest.fn().mockResolvedValue(temaActualizado),
    moderar: jest.fn(),
    listar: jest.fn(),
    listarRespuestas: jest.fn(),
  };
  return { repositorioTemas, temaActualizado };
}

describe('EditarTemaForo', () => {
  it('edita el tema propio cuando no fue moderado', async () => {
    const { repositorioTemas } = crearFakes();
    const caso = new EditarTemaForo(repositorioTemas);

    const resultado = await caso.ejecutar({ datosCrudos: datosValidos, temaId, usuarioId });

    expect(resultado.titulo).toBe(datosValidos.titulo);
    expect(repositorioTemas.actualizar).toHaveBeenCalledWith(temaId, usuarioId, datosValidos);
  });

  it('rechaza con 403 / PEA-SIS-002 cuando quien invoca no es el autor', async () => {
    const { repositorioTemas } = crearFakes({ actual: crearTemaActual({ creadoPor: otroUsuarioId }) });
    const caso = new EditarTemaForo(repositorioTemas);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, temaId, usuarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioTemas.actualizar).not.toHaveBeenCalled();
  });

  it('AC / Paso 3: rechaza con 403 / PEA-FORO-004 cuando el tema ya fue moderado', async () => {
    const { repositorioTemas } = crearFakes({ actual: crearTemaActual({ moderado: true }) });
    const caso = new EditarTemaForo(repositorioTemas);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, temaId, usuarioId })).rejects.toBeInstanceOf(TemaForoModeradoError);
    expect(repositorioTemas.actualizar).not.toHaveBeenCalled();
  });

  it('responde 404 / PEA-FORO-002 si el tema no existe', async () => {
    const { repositorioTemas } = crearFakes({ actual: null });
    const caso = new EditarTemaForo(repositorioTemas);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, temaId, usuarioId })).rejects.toBeInstanceOf(TemaForoNoEncontradoError);
  });

  it('rechaza con 403 / PEA-FORO-004 si el tema se modera entre autorizar() y persistir() (carrera)', async () => {
    const { repositorioTemas } = crearFakes();
    repositorioTemas.actualizar.mockResolvedValueOnce(null);
    const caso = new EditarTemaForo(repositorioTemas);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, temaId, usuarioId })).rejects.toBeInstanceOf(TemaForoModeradoError);
  });
});
