/**
 * @jest-environment node
 *
 * Paso 1 del ticket AUTH-08: lista paginada (tope 50) de verificaciones
 * pendientes, ordenadas por created_at. AC: rol distinto de administrador
 * recibe 403.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { IRepositorioVerificaciones } from '@dominio/puertos/IRepositorioVerificaciones';
import type { PaginaVerificacionesPendientes, FilaVerificacionPendiente } from '@dominio/entidades/Verificacion';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { GET } from '@app/api/admin/verificaciones/route';

class RepositorioPerfilFalso implements IRepositorioPerfil {
  constructor(private readonly perfiles: Record<string, ResumenPerfilPropio>) {}

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return this.perfiles[usuarioId] ?? null;
  }
}

function filaDePrueba(id: string): FilaVerificacionPendiente {
  return {
    id,
    usuarioId: `usuario-${id}`,
    tipo: 'veterinario',
    email: `${id}@ejemplo.test`,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    matricula: 'MP-1000',
    colegioEmisor: 'Colegio X',
    nombreInstitucional: null,
  };
}

class RepositorioVerificacionesFalso implements IRepositorioVerificaciones {
  llamadaPagina: number | null = null;
  llamadaPorPagina: number | null = null;

  async listarPendientes(pagina: number, porPagina: number): Promise<PaginaVerificacionesPendientes> {
    this.llamadaPagina = pagina;
    this.llamadaPorPagina = porPagina;
    return { items: [filaDePrueba('v1'), filaDePrueba('v2')], total: 2, pagina, porPagina };
  }

  async resolver(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

function autenticarComo(usuarioId: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: usuarioId } }, error: null });
}

function crearRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/verificaciones${query}`, { method: 'GET' });
}

describe('GET /api/admin/verificaciones (AUTH-08)', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    container.reset();
  });

  it('lista las verificaciones pendientes para un administrador, con paginación server-side', async () => {
    autenticarComo('admin-1');
    container.registerInstance<IRepositorioPerfil>(
      'IRepositorioPerfil',
      new RepositorioPerfilFalso({
        'admin-1': { id: 'admin-1', email: 'admin@ejemplo.test', rol: 'administrador', estadoVerificacion: 'no_requerido', verificadoEn: null },
      }),
    );
    const repositorioVerificaciones = new RepositorioVerificacionesFalso();
    container.registerInstance<IRepositorioVerificaciones>('IRepositorioVerificaciones', repositorioVerificaciones);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(2);
    expect(cuerpo.total).toBe(2);
    expect(repositorioVerificaciones.llamadaPagina).toBe(1);
    expect(repositorioVerificaciones.llamadaPorPagina).toBe(50);
  });

  it('nunca permite pedir más de 50 por página, aunque se fuerce por query string', async () => {
    autenticarComo('admin-1');
    container.registerInstance<IRepositorioPerfil>(
      'IRepositorioPerfil',
      new RepositorioPerfilFalso({
        'admin-1': { id: 'admin-1', email: 'admin@ejemplo.test', rol: 'administrador', estadoVerificacion: 'no_requerido', verificadoEn: null },
      }),
    );
    const repositorioVerificaciones = new RepositorioVerificacionesFalso();
    container.registerInstance<IRepositorioVerificaciones>('IRepositorioVerificaciones', repositorioVerificaciones);

    await GET(crearRequest('?porPagina=500'));

    expect(repositorioVerificaciones.llamadaPorPagina).toBe(50);
  });

  it.each(['dueño', 'veterinario', 'rescatista'])('rechaza con 403 (PEA-SIS-002) a un solicitante con rol %s', async (rol) => {
    autenticarComo('usuario-1');
    container.registerInstance<IRepositorioPerfil>(
      'IRepositorioPerfil',
      new RepositorioPerfilFalso({
        'usuario-1': { id: 'usuario-1', email: 'x@ejemplo.test', rol, estadoVerificacion: 'no_requerido', verificadoEn: null },
      }),
    );
    container.registerInstance<IRepositorioVerificaciones>('IRepositorioVerificaciones', new RepositorioVerificacionesFalso());

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'sin sesión' } });
    container.registerInstance<IRepositorioVerificaciones>('IRepositorioVerificaciones', new RepositorioVerificacionesFalso());

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });
});
