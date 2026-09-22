/**
 * @jest-environment node
 */
import { CrearRespuestaForo } from '@aplicacion/casos-de-uso/foros-cursos/CrearRespuestaForo';
import type { IRepositorioTemasForo, RespuestaForo } from '@dominio/puertos/IRepositorioTemasForo';
import { ContenidoTemaRequeridoError } from '@dominio/errores/erroresForosCursos';

const temaId = '33333333-3333-3333-3333-333333333333';

function crearFakes() {
  const respuestaCreada: RespuestaForo = {
    id: 'r1',
    temaId,
    usuarioId: 'user-1',
    contenido: 'Gracias por la info',
    createdAt: new Date('2026-09-17T10:00:00.000Z'),
  };
  const repositorioTemas: jest.Mocked<IRepositorioTemasForo> = {
    crear: jest.fn(),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    moderar: jest.fn(),
    listar: jest.fn(),
    listarRespuestas: jest.fn(),
    crearRespuesta: jest.fn().mockResolvedValue(respuestaCreada),
  };
  return { repositorioTemas, respuestaCreada };
}

describe('CrearRespuestaForo', () => {
  it('publica una respuesta sanitizada', async () => {
    const { repositorioTemas, respuestaCreada } = crearFakes();
    const caso = new CrearRespuestaForo(repositorioTemas);

    const resultado = await caso.ejecutar({
      datosCrudos: { contenido: 'Gracias por la info' },
      temaId,
      usuarioId: 'user-1',
    });

    expect(repositorioTemas.crearRespuesta).toHaveBeenCalledWith(
      temaId,
      'user-1',
      'Gracias por la info',
    );
    expect(resultado).toEqual({
      id: respuestaCreada.id,
      temaId: respuestaCreada.temaId,
      usuarioId: respuestaCreada.usuarioId,
      contenido: respuestaCreada.contenido,
      createdAt: respuestaCreada.createdAt.toISOString(),
    });
  });

  it('rechaza un contenido vacío con PEA-FORO-003', async () => {
    const { repositorioTemas } = crearFakes();
    const caso = new CrearRespuestaForo(repositorioTemas);

    await expect(
      caso.ejecutar({ datosCrudos: { contenido: '   ' }, temaId, usuarioId: 'user-1' }),
    ).rejects.toThrow(ContenidoTemaRequeridoError);
  });
});
