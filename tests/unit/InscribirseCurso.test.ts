/**
 * @jest-environment node
 *
 * Prisma Client detecta un entorno "browser" bajo jsdom (define `window`) y
 * degrada su export `Prisma` — `Prisma.PrismaClientKnownRequestError` deja de
 * ser un constructor utilizable. Este caso de uso es puro backend: correrlo
 * bajo el entorno node evita ese falso positivo.
 */
import { Prisma } from '@prisma/client';
import { InscribirseCurso } from '@aplicacion/casos-de-uso/foros-cursos/InscribirseCurso';
import type { IRepositorioInscripcionesCurso, InscripcionCurso } from '@dominio/puertos/IRepositorioInscripcionesCurso';
import { TemaForoNoEncontradoError, YaInscriptoEnCursoError } from '@dominio/errores/erroresForosCursos';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const cursoId = '22222222-2222-2222-2222-222222222222';

function crearErrorPrisma(codigo: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(`Error simulado ${codigo}`, { code: codigo, clientVersion: '5.22.0' });
}

function crearFakes() {
  const inscripcionCreada: InscripcionCurso = { id: 'inscripcion-1', cursoId, usuarioId, inscritoEn: new Date('2026-09-15T10:00:00.000Z') };
  const repositorioInscripciones: jest.Mocked<IRepositorioInscripcionesCurso> = {
    crear: jest.fn().mockResolvedValue(inscripcionCreada),
    darDeBaja: jest.fn(),
  };
  return { repositorioInscripciones, inscripcionCreada };
}

describe('InscribirseCurso', () => {
  it('Paso 1: inscribe al usuario autenticado en el curso solicitado', async () => {
    const { repositorioInscripciones } = crearFakes();
    const caso = new InscribirseCurso(repositorioInscripciones);

    const resultado = await caso.ejecutar({ datosCrudos: { cursoId }, usuarioId });

    expect(resultado).toEqual({ id: 'inscripcion-1', cursoId, usuarioId, inscritoEn: '2026-09-15T10:00:00.000Z' });
    expect(repositorioInscripciones.crear).toHaveBeenCalledWith(cursoId, usuarioId);
  });

  it('AC / Paso 2: rechaza con 409 / PEA-FORO-001 cuando ya existe la inscripción (violación de ux_inscripcion_curso_usuario)', async () => {
    const { repositorioInscripciones } = crearFakes();
    repositorioInscripciones.crear.mockRejectedValue(crearErrorPrisma('P2002'));
    const caso = new InscribirseCurso(repositorioInscripciones);

    await expect(caso.ejecutar({ datosCrudos: { cursoId }, usuarioId })).rejects.toBeInstanceOf(YaInscriptoEnCursoError);
  });

  it('responde 404 / PEA-FORO-002 si el curso no existe (violación de la FK hacia cursos)', async () => {
    const { repositorioInscripciones } = crearFakes();
    repositorioInscripciones.crear.mockRejectedValue(crearErrorPrisma('P2003'));
    const caso = new InscribirseCurso(repositorioInscripciones);

    await expect(caso.ejecutar({ datosCrudos: { cursoId }, usuarioId })).rejects.toBeInstanceOf(TemaForoNoEncontradoError);
  });

  it('relanza cualquier otro error de Prisma sin traducirlo', async () => {
    const { repositorioInscripciones } = crearFakes();
    repositorioInscripciones.crear.mockRejectedValue(crearErrorPrisma('P2025'));
    const caso = new InscribirseCurso(repositorioInscripciones);

    await expect(caso.ejecutar({ datosCrudos: { cursoId }, usuarioId })).rejects.toThrow('Error simulado P2025');
  });

  it('rechaza un cursoId con formato inválido antes de tocar el repositorio', async () => {
    const { repositorioInscripciones } = crearFakes();
    const caso = new InscribirseCurso(repositorioInscripciones);

    await expect(caso.ejecutar({ datosCrudos: { cursoId: 'no-es-un-uuid' }, usuarioId })).rejects.toThrow();
    expect(repositorioInscripciones.crear).not.toHaveBeenCalled();
  });
});
