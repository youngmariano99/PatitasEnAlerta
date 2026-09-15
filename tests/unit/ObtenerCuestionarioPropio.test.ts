/**
 * @jest-environment node
 */
import { ObtenerCuestionarioPropio } from '@aplicacion/casos-de-uso/adopcion-compatibilidad/ObtenerCuestionarioPropio';
import type { CuestionarioAdoptante } from '@dominio/entidades/CuestionarioAdoptante';
import type { IRepositorioCuestionariosAdoptante } from '@dominio/puertos/IRepositorioCuestionariosAdoptante';
import { CuestionarioNoEncontradoError } from '@dominio/errores/erroresAdopcionCompatibilidad';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const otroUsuarioId = '55555555-5555-5555-5555-555555555555';

const cuestionarioPropio: CuestionarioAdoptante = {
  id: 'cuestionario-1',
  usuarioId,
  horasSoloEstimadas: 4,
  presenciaNinos: false,
  espacioDisponible: 'departamento',
  experienciaPrevia: 'Tuvo un gato',
  createdAt: new Date('2026-09-15T10:00:00.000Z'),
  updatedAt: new Date('2026-09-15T10:00:00.000Z'),
};

function crearFakes(opciones?: { cuestionario?: CuestionarioAdoptante | null }) {
  const repositorioCuestionarios: jest.Mocked<IRepositorioCuestionariosAdoptante> = {
    obtenerPropio: jest.fn().mockResolvedValue(opciones && 'cuestionario' in opciones ? opciones.cuestionario : cuestionarioPropio),
    crear: jest.fn(),
    actualizar: jest.fn(),
  };
  return { repositorioCuestionarios };
}

describe('ObtenerCuestionarioPropio', () => {
  it('devuelve el cuestionario del usuario autenticado', async () => {
    const { repositorioCuestionarios } = crearFakes();
    const caso = new ObtenerCuestionarioPropio(repositorioCuestionarios);

    const resultado = await caso.ejecutar({ usuarioId });

    expect(resultado.usuarioId).toBe(usuarioId);
    expect(repositorioCuestionarios.obtenerPropio).toHaveBeenCalledWith(usuarioId);
  });

  // AC explícito: "solo puede acceder al propio, nunca al de otro adoptante" —
  // se demuestra consultando con el id de otro usuario: el repositorio
  // siempre se invoca con el usuarioId que llega, nunca con uno ajeno mezclado.
  it('AC: consulta exclusivamente por el usuarioId de quien invoca, nunca uno ajeno', async () => {
    const { repositorioCuestionarios } = crearFakes();
    const caso = new ObtenerCuestionarioPropio(repositorioCuestionarios);

    await caso.ejecutar({ usuarioId: otroUsuarioId });

    expect(repositorioCuestionarios.obtenerPropio).toHaveBeenCalledWith(otroUsuarioId);
    expect(repositorioCuestionarios.obtenerPropio).not.toHaveBeenCalledWith(usuarioId);
  });

  it('responde 404 / PEA-ADOP-003 si el usuario nunca completó un cuestionario', async () => {
    const { repositorioCuestionarios } = crearFakes({ cuestionario: null });
    const caso = new ObtenerCuestionarioPropio(repositorioCuestionarios);

    await expect(caso.ejecutar({ usuarioId })).rejects.toBeInstanceOf(CuestionarioNoEncontradoError);
  });
});
