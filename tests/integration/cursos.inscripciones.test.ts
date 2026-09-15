/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Caso de uso InscribirseCurso con restricción de
 * unicidad" (Módulo 8): inscribe dos veces al mismo curso y confirma el 409
 * (PEA-FORO-001), más el resto de los AC de la inscripción y su baja.
 */
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioInscripcionesCurso, InscripcionCurso } from '@dominio/puertos/IRepositorioInscripcionesCurso';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { POST as inscribirse, DELETE as darDeBajaInscripcion } from '@app/api/foros-cursos/cursos/[id]/inscripciones/route';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const cursoId = '22222222-2222-2222-2222-222222222222';
const cursoInexistenteId = '99999999-9999-9999-9999-999999999999';

/**
 * Reproduce el índice único `ux_inscripcion_curso_usuario` real: un mismo
 * par (cursoId, usuarioId) insertado dos veces lanza el mismo error de
 * Prisma (P2002) que la base de datos — el caso de uso lo captura y lo
 * traduce a PEA-FORO-001 (Paso 2), nunca se verifica con un pre-chequeo.
 */
class RepositorioInscripcionesCursoFalso implements IRepositorioInscripcionesCurso {
  public inscripciones = new Set<string>();

  async crear(cursoIdRecibido: string, usuarioIdRecibido: string): Promise<InscripcionCurso> {
    if (cursoIdRecibido === cursoInexistenteId) {
      throw new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed on cursoId', {
        code: 'P2003',
        clientVersion: '5.22.0',
      });
    }
    const clave = `${cursoIdRecibido}:${usuarioIdRecibido}`;
    if (this.inscripciones.has(clave)) {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed on ux_inscripcion_curso_usuario', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });
    }
    this.inscripciones.add(clave);
    return { id: 'inscripcion-1', cursoId: cursoIdRecibido, usuarioId: usuarioIdRecibido, inscritoEn: new Date('2026-09-15T10:00:00.000Z') };
  }

  async darDeBaja(cursoIdRecibido: string, usuarioIdRecibido: string): Promise<boolean> {
    return this.inscripciones.delete(`${cursoIdRecibido}:${usuarioIdRecibido}`);
  }
}

function autenticarComo(usuarioIdSesion: string | null) {
  getUserMock.mockResolvedValue(
    usuarioIdSesion
      ? { data: { user: { id: usuarioIdSesion } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(url: string, method: string): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method });
}

describe('Inscripción a cursos (Módulo 8, Paso 1/2/3/4)', () => {
  let repositorioInscripciones: RepositorioInscripcionesCursoFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioInscripciones = new RepositorioInscripcionesCursoFalso();
    container.reset();
    container.registerInstance<IRepositorioInscripcionesCurso>('IRepositorioInscripcionesCurso', repositorioInscripciones);
  });

  it('AC: inscribe con éxito a un usuario no inscripto (201, refleja en el repositorio)', async () => {
    autenticarComo(usuarioId);

    const respuesta = await inscribirse(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'POST'), {
      params: { id: cursoId },
    });

    expect(respuesta.status).toBe(201);
    expect(repositorioInscripciones.inscripciones.has(`${cursoId}:${usuarioId}`)).toBe(true);
  });

  it('AC / Paso 4: inscribe dos veces al mismo curso y la segunda responde 409 / PEA-FORO-001', async () => {
    autenticarComo(usuarioId);

    const primeraRespuesta = await inscribirse(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'POST'), {
      params: { id: cursoId },
    });
    expect(primeraRespuesta.status).toBe(201);

    const segundaRespuesta = await inscribirse(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'POST'), {
      params: { id: cursoId },
    });

    expect(segundaRespuesta.status).toBe(409);
    const cuerpo = await segundaRespuesta.json();
    expect(cuerpo.codigo).toBe('PEA-FORO-001');
  });

  it('responde 404 / PEA-FORO-002 si el curso no existe', async () => {
    autenticarComo(usuarioId);

    const respuesta = await inscribirse(crearRequest(`/api/foros-cursos/cursos/${cursoInexistenteId}/inscripciones`, 'POST'), {
      params: { id: cursoInexistenteId },
    });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-FORO-002');
  });

  it('responde 401 sin sesión activa', async () => {
    autenticarComo(null);

    const respuesta = await inscribirse(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'POST'), {
      params: { id: cursoId },
    });

    expect(respuesta.status).toBe(401);
  });

  describe('DELETE /api/foros-cursos/cursos/[id]/inscripciones', () => {
    it('verificación técnica: da de baja la inscripción propia (200), controlada exclusivamente por el propio usuario', async () => {
      autenticarComo(usuarioId);
      await inscribirse(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'POST'), { params: { id: cursoId } });

      const respuesta = await darDeBajaInscripcion(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'DELETE'), {
        params: { id: cursoId },
      });

      expect(respuesta.status).toBe(200);
      expect(repositorioInscripciones.inscripciones.has(`${cursoId}:${usuarioId}`)).toBe(false);
    });

    it('permite volver a inscribirse después de dar de baja la inscripción (el índice único no bloquea altas nuevas)', async () => {
      autenticarComo(usuarioId);
      await inscribirse(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'POST'), { params: { id: cursoId } });
      await darDeBajaInscripcion(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'DELETE'), { params: { id: cursoId } });

      const respuesta = await inscribirse(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'POST'), {
        params: { id: cursoId },
      });

      expect(respuesta.status).toBe(201);
    });

    it('responde 404 / PEA-FORO-002 si no había inscripción propia activa para ese curso', async () => {
      autenticarComo(usuarioId);

      const respuesta = await darDeBajaInscripcion(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'DELETE'), {
        params: { id: cursoId },
      });

      expect(respuesta.status).toBe(404);
    });

    it('responde 401 sin sesión activa', async () => {
      autenticarComo(null);

      const respuesta = await darDeBajaInscripcion(crearRequest(`/api/foros-cursos/cursos/${cursoId}/inscripciones`, 'DELETE'), {
        params: { id: cursoId },
      });

      expect(respuesta.status).toBe(401);
    });
  });
});
