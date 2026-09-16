/**
 * @jest-environment node
 */
import { CrearTemaForo } from '@aplicacion/casos-de-uso/foros-cursos/CrearTemaForo';
import type { IRepositorioTemasForo, TemaForo } from '@dominio/puertos/IRepositorioTemasForo';
import { ContenidoTemaRequeridoError } from '@dominio/errores/erroresForosCursos';

const usuarioId = '11111111-1111-1111-1111-111111111111';

const datosValidos = {
  titulo: '<script>alert(1)</script>¿Cómo sé si mi perro está bien de peso?',
  contenido: '<script>alert(1)</script>Quisiera saber qué señales mirar en casa.',
};

function crearFakes() {
  const temaCreado: TemaForo = {
    id: 'tema-1',
    creadoPor: usuarioId,
    titulo: '¿Cómo sé si mi perro está bien de peso?',
    contenido: 'Quisiera saber qué señales mirar en casa.',
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
  };
  const repositorioTemas: jest.Mocked<IRepositorioTemasForo> = {
    crear: jest.fn().mockResolvedValue(temaCreado),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    moderar: jest.fn(),
    listar: jest.fn(),
    listarRespuestas: jest.fn(),
  };
  return { repositorioTemas, temaCreado };
}

describe('CrearTemaForo', () => {
  it('Paso 1: publica el tema para cualquier usuario autenticado, sin restricción de rol', async () => {
    const { repositorioTemas } = crearFakes();
    const caso = new CrearTemaForo(repositorioTemas);

    const resultado = await caso.ejecutar({ datosCrudos: datosValidos, usuarioId });

    expect(resultado.creadoPor).toBe(usuarioId);
    expect(repositorioTemas.crear).toHaveBeenCalledWith(usuarioId, {
      titulo: '¿Cómo sé si mi perro está bien de peso?',
      contenido: 'Quisiera saber qué señales mirar en casa.',
    });
  });

  it('Paso 1 (AC): sanitiza titulo y contenido con DOMPurify antes de persistir, despojando cualquier etiqueta HTML', async () => {
    const { repositorioTemas } = crearFakes();
    const caso = new CrearTemaForo(repositorioTemas);

    await caso.ejecutar({ datosCrudos: datosValidos, usuarioId });

    const [, datosEnviados] = repositorioTemas.crear.mock.calls[0]!;
    expect(datosEnviados.titulo).not.toContain('<script>');
    expect(datosEnviados.contenido).not.toContain('<script>');
  });

  it.each(['titulo', 'contenido'])('rechaza con 400 / PEA-FORO-003 cuando falta %s', async (campoVacio) => {
    const { repositorioTemas } = crearFakes();
    const caso = new CrearTemaForo(repositorioTemas);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosValidos, [campoVacio]: '   ' }, usuarioId }),
    ).rejects.toBeInstanceOf(ContenidoTemaRequeridoError);
    expect(repositorioTemas.crear).not.toHaveBeenCalled();
  });
});
