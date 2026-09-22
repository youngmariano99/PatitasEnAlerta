/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Endpoint paginado de temas_foro y respuestas_foro"
 * (Módulo 8): verifica la paginación server-side (tope 50) contra un
 * dataset de más de 50 filas de temas_foro, más el filtrado de
 * respuestas_foro por tema_id.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  IRepositorioTemasForo,
  PaginaTemasForo,
  RespuestaForo,
  TemaForo,
  TemaForoActual,
} from '@dominio/puertos/IRepositorioTemasForo';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { GET as listarTemas } from '@app/api/foros-cursos/temas/route';
import { GET as listarRespuestas } from '@app/api/foros-cursos/temas/[id]/respuestas/route';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const temaId = '33333333-3333-3333-3333-333333333333';
const TOTAL_TEMAS_SEMBRADOS = 55;

function idTema(indice: number): string {
  return `33333333-3333-3333-3333-${String(indice).padStart(12, '0')}`;
}

class RepositorioTemasForoFalso implements IRepositorioTemasForo {
  public temas: TemaForo[] = Array.from({ length: TOTAL_TEMAS_SEMBRADOS }, (_, indice) => ({
    id: idTema(indice + 1),
    creadoPor: usuarioId,
    titulo: `Tema ${indice + 1}`,
    contenido: 'Consulta de la comunidad sobre bienestar y cuidado de mascotas.',
    createdAt: new Date(2026, 8, 15, 10, 0, indice),
  }));
  public respuestasPorTema: Record<string, RespuestaForo[]> = {
    [temaId]: [
      {
        id: 'r1',
        temaId,
        usuarioId,
        contenido: 'Primera respuesta',
        createdAt: new Date('2026-09-15T10:00:00.000Z'),
      },
      {
        id: 'r2',
        temaId,
        usuarioId,
        contenido: 'Segunda respuesta',
        createdAt: new Date('2026-09-15T11:00:00.000Z'),
      },
    ],
  };

  async crear(): Promise<TemaForo> {
    throw new Error('no usado en este test');
  }

  async obtenerActual(): Promise<TemaForoActual | null> {
    throw new Error('no usado en este test');
  }

  async actualizar(): Promise<TemaForo | null> {
    throw new Error('no usado en este test');
  }

  async moderar(): Promise<boolean> {
    throw new Error('no usado en este test');
  }

  async listar(pagina: number, porPagina: number): Promise<PaginaTemasForo> {
    const inicio = (pagina - 1) * porPagina;
    const items = this.temas.slice(inicio, inicio + porPagina);
    return { items, total: this.temas.length, pagina, porPagina };
  }

  async listarRespuestas(temaId: string): Promise<RespuestaForo[]> {
    return this.respuestasPorTema[temaId] ?? [];
  }

  async crearRespuesta(): Promise<RespuestaForo> {
    throw new Error('no usado en este test');
  }
}

function autenticarComo(usuarioIdSesion: string | null) {
  getUserMock.mockResolvedValue(
    usuarioIdSesion
      ? { data: { user: { id: usuarioIdSesion } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequestGet(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' });
}

describe('GET /api/foros-cursos/temas y /api/foros-cursos/temas/[id]/respuestas (Módulo 8, Paso 1/2/4)', () => {
  let repositorioTemas: RepositorioTemasForoFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioTemas = new RepositorioTemasForoFalso();
    container.reset();
    container.registerInstance<IRepositorioTemasForo>('IRepositorioTemasForo', repositorioTemas);
  });

  it('responde 401 sin sesión activa', async () => {
    autenticarComo(null);

    const respuesta = await listarTemas(crearRequestGet('/api/foros-cursos/temas'));

    expect(respuesta.status).toBe(401);
  });

  it('AC / Paso 4: con más de 50 temas activos, la primera página trae exactamente 50 (tope) y total refleja el dataset completo', async () => {
    autenticarComo(usuarioId);

    const respuesta = await listarTemas(crearRequestGet('/api/foros-cursos/temas'));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo.items).toHaveLength(50);
    expect(cuerpo.total).toBe(TOTAL_TEMAS_SEMBRADOS);
    expect(cuerpo.pagina).toBe(1);
    expect(cuerpo.porPagina).toBe(50);
  });

  it('AC / Paso 4: la segunda página trae el resto del dataset (5 temas)', async () => {
    autenticarComo(usuarioId);

    const respuesta = await listarTemas(crearRequestGet('/api/foros-cursos/temas?pagina=2'));
    const cuerpo = await respuesta.json();

    expect(cuerpo.items).toHaveLength(5);
    expect(cuerpo.pagina).toBe(2);
  });

  it('ignora un porPagina por encima del tope y lo clampea a 50', async () => {
    autenticarComo(usuarioId);

    const respuesta = await listarTemas(crearRequestGet('/api/foros-cursos/temas?porPagina=200'));
    const cuerpo = await respuesta.json();

    expect(cuerpo.porPagina).toBe(50);
    expect(cuerpo.items).toHaveLength(50);
  });

  it('Paso 3: cero temas devuelve items vacío (soporta el estado vacío border-dashed del cliente)', async () => {
    autenticarComo(usuarioId);
    repositorioTemas.temas = [];

    const respuesta = await listarTemas(crearRequestGet('/api/foros-cursos/temas'));
    const cuerpo = await respuesta.json();

    expect(cuerpo.items).toEqual([]);
    expect(cuerpo.total).toBe(0);
  });

  it('AC: las respuestas de un tema se filtran correctamente por tema_id', async () => {
    autenticarComo(usuarioId);

    const respuesta = await listarRespuestas(
      crearRequestGet(`/api/foros-cursos/temas/${temaId}/respuestas`),
      {
        params: { id: temaId },
      },
    );
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo).toHaveLength(2);
    expect(cuerpo.every((respuestaItem: RespuestaForo) => respuestaItem.temaId === temaId)).toBe(
      true,
    );
  });

  it('responde 401 en las respuestas de un tema sin sesión activa', async () => {
    autenticarComo(null);

    const respuesta = await listarRespuestas(
      crearRequestGet(`/api/foros-cursos/temas/${temaId}/respuestas`),
      {
        params: { id: temaId },
      },
    );

    expect(respuesta.status).toBe(401);
  });
});
