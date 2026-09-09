/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { ColaboracionActual, HistorialEstadoColaboracionItem, IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { GET } from '@app/api/red-colaboracion/colaboraciones/[id]/historial/route';

const COLABORACION_ID = '11111111-1111-1111-1111-111111111111';
const ORGANIZACION_ID = '22222222-2222-2222-2222-222222222222';
const STAKEHOLDER_ID = '33333333-3333-3333-3333-333333333333';
const AJENO_ID = '44444444-4444-4444-4444-444444444444';

const HISTORIAL: HistorialEstadoColaboracionItem[] = [
  { id: 'h1', estadoAnterior: 'propuesta', estadoNuevo: 'aceptada', usuarioId: ORGANIZACION_ID, registradoEn: new Date('2026-09-01T10:00:00.000Z') },
  { id: 'h2', estadoAnterior: 'aceptada', estadoNuevo: 'completada', usuarioId: ORGANIZACION_ID, registradoEn: new Date('2026-09-02T10:00:00.000Z') },
];

class RepositorioColaboracionesFalso implements IRepositorioColaboraciones {
  public actual: ColaboracionActual | null = { estado: 'completada', organizacionId: ORGANIZACION_ID, stakeholderId: STAKEHOLDER_ID };

  async obtenerActual(): Promise<ColaboracionActual | null> {
    return this.actual;
  }

  async actualizarEstado(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarHistorialEstado(): Promise<HistorialEstadoColaboracionItem[]> {
    return HISTORIAL;
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'dueño';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'usuario@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: null };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/red-colaboracion/colaboraciones/${id}/historial`, { method: 'GET' });
}

describe('GET /api/red-colaboracion/colaboraciones/[id]/historial (Vista de seguimiento)', () => {
  let repositorioColaboraciones: RepositorioColaboracionesFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioColaboraciones = new RepositorioColaboracionesFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioColaboraciones>('IRepositorioColaboraciones', repositorioColaboraciones);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await GET(crearRequest(COLABORACION_ID), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(401);
  });

  it('la organización dueña de la solicitud accede al historial, ordenado cronológicamente', async () => {
    autenticarComo(ORGANIZACION_ID);

    const respuesta = await GET(crearRequest(COLABORACION_ID), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toHaveLength(2);
    expect(new Date(cuerpo[0].registradoEn).getTime()).toBeLessThan(new Date(cuerpo[1].registradoEn).getTime());
  });

  it('el stakeholder que propuso la colaboración también accede al historial', async () => {
    autenticarComo(STAKEHOLDER_ID);

    const respuesta = await GET(crearRequest(COLABORACION_ID), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(200);
  });

  it('administrador accede al historial aunque no sea parte de la colaboración', async () => {
    autenticarComo(AJENO_ID);
    repositorioPerfil.rol = 'administrador';

    const respuesta = await GET(crearRequest(COLABORACION_ID), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(200);
  });

  it('rechaza con 403 / PEA-SIS-002 a un usuario ajeno a la colaboración', async () => {
    autenticarComo(AJENO_ID);
    repositorioPerfil.rol = 'dueño';

    const respuesta = await GET(crearRequest(COLABORACION_ID), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it('rechaza una colaboración inexistente (404 / PEA-RED-005)', async () => {
    autenticarComo(ORGANIZACION_ID);
    repositorioColaboraciones.actual = null;

    const respuesta = await GET(crearRequest(COLABORACION_ID), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-RED-005');
  });
});
