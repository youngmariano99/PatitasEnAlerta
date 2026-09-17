/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Caso de uso CrearTemaForo con moderación de
 * Administrador" (Módulo 8): crea un tema, lo modera como Administrador y
 * confirma que la edición posterior del autor queda bloqueada con
 * 403/PEA-FORO-004.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  DatosTemaForo,
  IRepositorioTemasForo,
  TemaForo,
  TemaForoActual,
} from '@dominio/puertos/IRepositorioTemasForo';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { POST as publicarTema } from '@app/api/foros-cursos/temas/route';
import { PATCH as editarTema } from '@app/api/foros-cursos/temas/[id]/route';
import { POST as moderarTema } from '@app/api/foros-cursos/temas/[id]/moderar/route';

const autorId = '11111111-1111-1111-1111-111111111111';
const adminId = '22222222-2222-2222-2222-222222222222';
const dueñoId = '55555555-5555-5555-5555-555555555555';
const temaId = '33333333-3333-3333-3333-333333333333';

class RepositorioTemasForoFalso implements IRepositorioTemasForo {
  public temas = new Map<string, TemaForoActual & DatosTemaForo>();

  async crear(creadoPor: string, datos: DatosTemaForo): Promise<TemaForo> {
    this.temas.set(temaId, { id: temaId, creadoPor, moderado: false, ...datos });
    return { id: temaId, creadoPor, ...datos, createdAt: new Date('2026-09-15T10:00:00.000Z') };
  }

  async obtenerActual(id: string): Promise<TemaForoActual | null> {
    const tema = this.temas.get(id);
    if (!tema) return null;
    return { id: tema.id, creadoPor: tema.creadoPor, moderado: tema.moderado };
  }

  async actualizar(id: string, creadoPor: string, datos: DatosTemaForo): Promise<TemaForo | null> {
    const tema = this.temas.get(id);
    if (!tema || tema.creadoPor !== creadoPor || tema.moderado) return null;
    this.temas.set(id, { ...tema, ...datos });
    return { id, creadoPor, ...datos, createdAt: new Date('2026-09-15T10:00:00.000Z') };
  }

  async moderar(id: string): Promise<boolean> {
    const tema = this.temas.get(id);
    if (!tema || tema.moderado) return false;
    this.temas.set(id, { ...tema, moderado: true });
    return true;
  }

  async listar(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarRespuestas(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async crearRespuesta(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public roles: Record<string, string> = {
    [autorId]: 'dueño',
    [adminId]: 'administrador',
    [dueñoId]: 'dueño',
  };

  async obtenerPerfilPropio(usuarioIdConsultado: string): Promise<ResumenPerfilPropio | null> {
    return {
      id: usuarioIdConsultado,
      email: 'usuario@ejemplo.test',
      rol: this.roles[usuarioIdConsultado] ?? 'dueño',
      estadoVerificacion: 'no_requerido',
      verificadoEn: null,
    };
  }
}

function autenticarComo(usuarioIdSesion: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: usuarioIdSesion } }, error: null });
}

function crearRequestJson(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const datosTema = {
  titulo: '¿Cada cuánto desparasitar a un gato adulto?',
  contenido: 'Vive en un departamento, ¿cambia la frecuencia?',
};
const datosEditados = { titulo: 'Título editado', contenido: 'Contenido editado' };

describe('Moderación de temas del foro (Módulo 8, Paso 2/3/4)', () => {
  let repositorioTemas: RepositorioTemasForoFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioTemas = new RepositorioTemasForoFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioTemasForo>('IRepositorioTemasForo', repositorioTemas);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('Paso 4: crea un tema, lo modera como Administrador y bloquea la edición posterior del autor (403/PEA-FORO-004)', async () => {
    autenticarComo(autorId);
    const respuestaCrear = await publicarTema(
      crearRequestJson('/api/foros-cursos/temas', 'POST', datosTema),
    );
    expect(respuestaCrear.status).toBe(201);

    autenticarComo(adminId);
    const respuestaModerar = await moderarTema(
      crearRequestJson(`/api/foros-cursos/temas/${temaId}/moderar`, 'POST'),
      {
        params: { id: temaId },
      },
    );
    expect(respuestaModerar.status).toBe(200);

    autenticarComo(autorId);
    const respuestaEditar = await editarTema(
      crearRequestJson(`/api/foros-cursos/temas/${temaId}`, 'PATCH', datosEditados),
      {
        params: { id: temaId },
      },
    );

    expect(respuestaEditar.status).toBe(403);
    const cuerpo = await respuestaEditar.json();
    expect(cuerpo.codigo).toBe('PEA-FORO-004');
  });

  it('AC: rechaza con 403 la moderación cuando quien invoca tiene rol distinto a administrador', async () => {
    autenticarComo(autorId);
    await publicarTema(crearRequestJson('/api/foros-cursos/temas', 'POST', datosTema));

    autenticarComo(dueñoId);
    const respuesta = await moderarTema(
      crearRequestJson(`/api/foros-cursos/temas/${temaId}/moderar`, 'POST'),
      {
        params: { id: temaId },
      },
    );

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it('permite editar el tema propio mientras no haya sido moderado', async () => {
    autenticarComo(autorId);
    await publicarTema(crearRequestJson('/api/foros-cursos/temas', 'POST', datosTema));

    const respuesta = await editarTema(
      crearRequestJson(`/api/foros-cursos/temas/${temaId}`, 'PATCH', datosEditados),
      {
        params: { id: temaId },
      },
    );

    expect(respuesta.status).toBe(200);
  });
});
