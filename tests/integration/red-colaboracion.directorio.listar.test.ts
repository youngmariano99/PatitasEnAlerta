/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  AliadoDirectorio,
  FiltrosDirectorioAliados,
  IRepositorioDirectorioAliados,
  PaginaDirectorioAliados,
} from '@dominio/puertos/IRepositorioDirectorioAliados';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que
// tests/integration/red-colaboracion.solicitudes.crear.test.ts.
import { GET } from '@app/api/red-colaboracion/directorio/route';

const aliadoDeEjemplo: AliadoDirectorio = {
  id: 'ong-1',
  rol: 'organizacion',
  email: 'ong@ejemplo.test',
  estadoVerificacion: 'verificado',
  matricula: null,
  colegioEmisor: null,
  latitud: -37.9989,
  longitud: -61.3565,
  createdAt: new Date('2026-09-09T09:00:00.000Z'),
};

class RepositorioDirectorioFalso implements IRepositorioDirectorioAliados {
  public ultimosFiltros: FiltrosDirectorioAliados | null = null;

  async listar(filtros: FiltrosDirectorioAliados, pagina: number, porPagina: number): Promise<PaginaDirectorioAliados> {
    this.ultimosFiltros = filtros;
    return { items: [aliadoDeEjemplo], total: 1, pagina, porPagina };
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'organizacion';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'solicitante@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: null };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(query: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/red-colaboracion/directorio');
  Object.entries(query).forEach(([clave, valor]) => url.searchParams.set(clave, valor));
  return new NextRequest(url);
}

describe('GET /api/red-colaboracion/directorio (Directorio de aliados verificados)', () => {
  let repositorioDirectorio: RepositorioDirectorioFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioDirectorio = new RepositorioDirectorioFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioDirectorioAliados>('IRepositorioDirectorioAliados', repositorioDirectorio);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it.each(['dueño', 'comerciante'])('rechaza con 403 / PEA-SIS-002 para un usuario con rol %s', async (rol) => {
    autenticarComo('usuario-1');
    repositorioPerfil.rol = rol;

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it.each(['organizacion', 'veterinario', 'rescatista', 'municipio', 'administrador'])(
    'permite el acceso (200) a un usuario con rol %s',
    async (rol) => {
      autenticarComo('usuario-1');
      repositorioPerfil.rol = rol;

      const respuesta = await GET(crearRequest());

      expect(respuesta.status).toBe(200);
    },
  );

  it('devuelve la página de aliados verificados con los valores por defecto de paginación', async () => {
    autenticarComo('ong-1');

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.total).toBe(1);
    expect(cuerpo.items[0].id).toBe('ong-1');
    expect(repositorioDirectorio.ultimosFiltros).toEqual({ rol: undefined, zona: undefined });
  });

  it('propaga el filtro de rol de la query al caso de uso', async () => {
    autenticarComo('ong-1');

    await GET(crearRequest({ rol: 'veterinario' }));

    expect(repositorioDirectorio.ultimosFiltros?.rol).toBe('veterinario');
  });

  it('propaga el filtro de zona completo (latitud + longitud + radioKm)', async () => {
    autenticarComo('ong-1');

    await GET(crearRequest({ latitud: '-37.9989', longitud: '-61.3565', radioKm: '10' }));

    expect(repositorioDirectorio.ultimosFiltros?.zona).toEqual({ latitud: -37.9989, longitud: -61.3565, radioKm: 10 });
  });

  it('rechaza un filtro de zona incompleto (400 / PEA-SIS-005)', async () => {
    autenticarComo('ong-1');

    const respuesta = await GET(crearRequest({ latitud: '-37.9989' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });
});
