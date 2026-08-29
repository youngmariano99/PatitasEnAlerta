/**
 * @jest-environment node
 *
 * Paso 1/2 del ticket AUTH-09: historial de auditoría de verificaciones ya
 * resueltas (estado <> 'pendiente'), exclusivo de rol administrador.
 * Paso 4: test de integración que confirma 403 (PEA-SIS-002) para un usuario
 * no administrador.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { IRepositorioVerificaciones } from '@dominio/puertos/IRepositorioVerificaciones';
import type { PaginaHistorialVerificaciones, FilaHistorialVerificacion } from '@dominio/entidades/Verificacion';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { GET } from '@app/api/admin/auditoria/route';

class RepositorioPerfilFalso implements IRepositorioPerfil {
  constructor(private readonly perfiles: Record<string, ResumenPerfilPropio>) {}

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return this.perfiles[usuarioId] ?? null;
  }
}

function filaDePrueba(id: string): FilaHistorialVerificacion {
  return {
    id,
    usuarioId: `usuario-${id}`,
    tipo: 'veterinario',
    email: `${id}@ejemplo.test`,
    estado: 'aprobado',
    motivoRechazo: null,
    revisadoPor: 'admin-1',
    resueltoEn: new Date('2024-02-01T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    matricula: 'MP-1000',
    colegioEmisor: 'Colegio X',
    nombreInstitucional: null,
  };
}

class RepositorioVerificacionesFalso implements IRepositorioVerificaciones {
  llamadaPagina: number | null = null;
  llamadaPorPagina: number | null = null;

  async listarPendientes(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarResueltas(pagina: number, porPagina: number): Promise<PaginaHistorialVerificaciones> {
    this.llamadaPagina = pagina;
    this.llamadaPorPagina = porPagina;
    return { items: [filaDePrueba('h1'), filaDePrueba('h2')], total: 2, pagina, porPagina };
  }

  async resolver(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

function autenticarComo(usuarioId: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: usuarioId } }, error: null });
}

function crearRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/auditoria${query}`, { method: 'GET' });
}

describe('GET /api/admin/auditoria (AUTH-09)', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    container.reset();
  });

  it('lista el historial de verificaciones resueltas para un administrador, con revisadoPor/motivoRechazo/resueltoEn', async () => {
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
    expect(cuerpo.items[0].revisadoPor).toBe('admin-1');
    expect(cuerpo.items[0].motivoRechazo).toBeNull();
    expect(cuerpo.items[0].resueltoEn).toBe('2024-02-01T00:00:00.000Z');
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
