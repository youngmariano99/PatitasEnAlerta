/**
 * @jest-environment node
 *
 * Paso 4 del ticket "CRUD de cursos restringido a Organización/Municipio"
 * (Módulo 8): confirma el rechazo con 403 para un dueño de mascota, más el
 * resto de los AC del alta de curso.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { Curso, DatosCurso, IRepositorioCursos } from '@dominio/puertos/IRepositorioCursos';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { POST as publicarCurso } from '@app/api/foros-cursos/cursos/route';

const usuarioId = '11111111-1111-1111-1111-111111111111';

const cursoPersistido: Curso = {
  id: '33333333-3333-3333-3333-333333333333',
  publicadoPor: usuarioId,
  titulo: 'Tenencia responsable básica',
  descripcion: 'Curso introductorio orientado a tutores de mascotas.',
  contenidoUrl: 'https://cdn.patitasenalerta.test/cursos/1',
  createdAt: new Date('2026-09-14T10:00:00.000Z'),
};

class RepositorioCursosFalso implements IRepositorioCursos {
  public creados: Array<{ publicadoPor: string; datos: DatosCurso }> = [];

  async crear(publicadoPor: string, datos: DatosCurso): Promise<Curso> {
    this.creados.push({ publicadoPor, datos });
    return { ...cursoPersistido, publicadoPor, ...datos };
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'organizacion';

  async obtenerPerfilPropio(usuarioIdConsultado: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioIdConsultado, email: 'organizacion@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: new Date() };
  }
}

function autenticarComo(usuarioIdSesion: string | null) {
  getUserMock.mockResolvedValue(
    usuarioIdSesion
      ? { data: { user: { id: usuarioIdSesion } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

const datosValidos = {
  titulo: 'Tenencia responsable básica',
  descripcion: 'Curso introductorio orientado a tutores de mascotas.',
  contenidoUrl: 'https://cdn.patitasenalerta.test/cursos/1',
};

function crearRequestJson(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('POST /api/foros-cursos/cursos (Módulo 8, Paso 1: alta restringida a Organización/Municipio)', () => {
  let repositorioCursos: RepositorioCursosFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioCursos = new RepositorioCursosFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioCursos>('IRepositorioCursos', repositorioCursos);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('publica el curso cuando quien invoca tiene rol organizacion (201)', async () => {
    autenticarComo(usuarioId);

    const respuesta = await publicarCurso(crearRequestJson('/api/foros-cursos/cursos', 'POST', datosValidos));

    expect(respuesta.status).toBe(201);
    expect(repositorioCursos.creados).toEqual([{ publicadoPor: usuarioId, datos: datosValidos }]);
  });

  it('publica el curso cuando quien invoca tiene rol municipio (201)', async () => {
    autenticarComo(usuarioId);
    repositorioPerfil.rol = 'municipio';

    const respuesta = await publicarCurso(crearRequestJson('/api/foros-cursos/cursos', 'POST', datosValidos));

    expect(respuesta.status).toBe(201);
  });

  it('AC / Paso 4: rechaza con 403 / PEA-SIS-002 a un dueño de mascota', async () => {
    autenticarComo(usuarioId);
    repositorioPerfil.rol = 'dueño';

    const respuesta = await publicarCurso(crearRequestJson('/api/foros-cursos/cursos', 'POST', datosValidos));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
    expect(repositorioCursos.creados).toHaveLength(0);
  });

  it('AC: rechaza con 400 un contenidoUrl mal formado', async () => {
    autenticarComo(usuarioId);

    const respuesta = await publicarCurso(
      crearRequestJson('/api/foros-cursos/cursos', 'POST', { ...datosValidos, contenidoUrl: 'no-es-una-url' }),
    );

    expect(respuesta.status).toBe(400);
    expect(repositorioCursos.creados).toHaveLength(0);
  });

  it('responde 401 / PEA-SIS-001 sin sesión activa', async () => {
    autenticarComo(null);

    const respuesta = await publicarCurso(crearRequestJson('/api/foros-cursos/cursos', 'POST', datosValidos));

    expect(respuesta.status).toBe(401);
  });
});
