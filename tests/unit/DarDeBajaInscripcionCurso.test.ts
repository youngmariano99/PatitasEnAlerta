/**
 * @jest-environment node
 */
import { DarDeBajaInscripcionCurso } from '@aplicacion/casos-de-uso/foros-cursos/DarDeBajaInscripcionCurso';
import type { IRepositorioInscripcionesCurso } from '@dominio/puertos/IRepositorioInscripcionesCurso';
import { TemaForoNoEncontradoError } from '@dominio/errores/erroresForosCursos';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const cursoId = '22222222-2222-2222-2222-222222222222';
const otroUsuarioId = '55555555-5555-5555-5555-555555555555';

function crearFakes(opciones?: { darDeBajaOk?: boolean }) {
  const repositorioInscripciones: jest.Mocked<IRepositorioInscripcionesCurso> = {
    crear: jest.fn(),
    darDeBaja: jest.fn().mockResolvedValue(opciones?.darDeBajaOk ?? true),
  };
  return { repositorioInscripciones };
}

describe('DarDeBajaInscripcionCurso', () => {
  it('Paso 3: da de baja la inscripción propia del usuario autenticado', async () => {
    const { repositorioInscripciones } = crearFakes();
    const caso = new DarDeBajaInscripcionCurso(repositorioInscripciones);

    const resultado = await caso.ejecutar({ datosCrudos: { cursoId }, usuarioId });

    expect(resultado).toEqual({ cursoId });
    expect(repositorioInscripciones.darDeBaja).toHaveBeenCalledWith(cursoId, usuarioId);
  });

  it('verificación técnica: la baja siempre está condicionada a la propia sesión, nunca a un usuarioId ajeno', async () => {
    const { repositorioInscripciones } = crearFakes();
    const caso = new DarDeBajaInscripcionCurso(repositorioInscripciones);

    await caso.ejecutar({ datosCrudos: { cursoId }, usuarioId: otroUsuarioId });

    expect(repositorioInscripciones.darDeBaja).toHaveBeenCalledWith(cursoId, otroUsuarioId);
    expect(repositorioInscripciones.darDeBaja).not.toHaveBeenCalledWith(cursoId, usuarioId);
  });

  it('responde 404 / PEA-FORO-002 si no había inscripción propia activa para ese curso', async () => {
    const { repositorioInscripciones } = crearFakes({ darDeBajaOk: false });
    const caso = new DarDeBajaInscripcionCurso(repositorioInscripciones);

    await expect(caso.ejecutar({ datosCrudos: { cursoId }, usuarioId })).rejects.toBeInstanceOf(TemaForoNoEncontradoError);
  });

  it('rechaza un cursoId con formato inválido antes de tocar el repositorio', async () => {
    const { repositorioInscripciones } = crearFakes();
    const caso = new DarDeBajaInscripcionCurso(repositorioInscripciones);

    await expect(caso.ejecutar({ datosCrudos: { cursoId: 'no-es-un-uuid' }, usuarioId })).rejects.toThrow();
    expect(repositorioInscripciones.darDeBaja).not.toHaveBeenCalled();
  });
});
