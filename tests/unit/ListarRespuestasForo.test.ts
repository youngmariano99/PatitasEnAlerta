/**
 * @jest-environment node
 */
import { ListarRespuestasForo } from '@aplicacion/casos-de-uso/foros-cursos/ListarRespuestasForo';
import type { IRepositorioTemasForo, RespuestaForo } from '@dominio/puertos/IRepositorioTemasForo';

const temaId = '33333333-3333-3333-3333-333333333333';

function crearFakes() {
  const respuestas: RespuestaForo[] = [
    {
      id: 'r1',
      temaId,
      usuarioId: 'user-1',
      contenido: 'Primera respuesta',
      createdAt: new Date('2026-09-15T10:00:00.000Z'),
    },
    {
      id: 'r2',
      temaId,
      usuarioId: 'user-2',
      contenido: 'Segunda respuesta',
      createdAt: new Date('2026-09-15T11:00:00.000Z'),
    },
  ];
  const repositorioTemas: jest.Mocked<IRepositorioTemasForo> = {
    crear: jest.fn(),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    moderar: jest.fn(),
    listar: jest.fn(),
    listarRespuestas: jest.fn().mockResolvedValue(respuestas),
    crearRespuesta: jest.fn(),
  };
  return { repositorioTemas, respuestas };
}

describe('ListarRespuestasForo', () => {
  it('AC / Paso 2: devuelve las respuestas del tema consultado por tema_id', async () => {
    const { repositorioTemas, respuestas } = crearFakes();
    const caso = new ListarRespuestasForo(repositorioTemas);

    const resultado = await caso.ejecutar({ temaId });

    expect(resultado).toEqual(respuestas);
    expect(repositorioTemas.listarRespuestas).toHaveBeenCalledWith(temaId);
  });

  it('rechaza un temaId con formato inválido antes de consultar el repositorio', async () => {
    const { repositorioTemas } = crearFakes();
    const caso = new ListarRespuestasForo(repositorioTemas);

    await expect(caso.ejecutar({ temaId: 'no-es-un-uuid' })).rejects.toThrow();
    expect(repositorioTemas.listarRespuestas).not.toHaveBeenCalled();
  });

  it('devuelve lista vacía si el tema no tiene respuestas (o no existe)', async () => {
    const { repositorioTemas } = crearFakes();
    repositorioTemas.listarRespuestas.mockResolvedValue([]);
    const caso = new ListarRespuestasForo(repositorioTemas);

    const resultado = await caso.ejecutar({ temaId });

    expect(resultado).toEqual([]);
  });
});
