/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { HistorialEstadoItem, IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { GET } from '@app/api/reportes/[id]/historial/route';

const REPORTE_ID = '11111111-1111-1111-1111-111111111111';
const DUENO_ID = '22222222-2222-2222-2222-222222222222';
const AJENO_ID = '33333333-3333-3333-3333-333333333333';

const HISTORIAL: HistorialEstadoItem[] = [
  { id: 'h1', estadoAnterior: 'reportado', estadoNuevo: 'en_revision', usuarioId: 'municipio-1', registradoEn: new Date('2026-08-01T10:00:00.000Z') },
  { id: 'h2', estadoAnterior: 'en_revision', estadoNuevo: 'en_atencion', usuarioId: 'municipio-1', registradoEn: new Date('2026-08-02T10:00:00.000Z') },
];

class RepositorioReportesFalso implements IRepositorioReportes {
  public propietarioId: string | null = DUENO_ID;

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }
  async buscarPerdidosActivosPorZonaYEspecie(): Promise<never[]> {
    throw new Error('no usado en este test');
  }
  async listar(): Promise<never> {
    throw new Error('no usado en este test');
  }
  async obtenerEstadoActual(): Promise<string | null> {
    throw new Error('no usado en este test');
  }
  async actualizarEstado(): Promise<never> {
    throw new Error('no usado en este test');
  }
  async obtenerPropietario(): Promise<string | null> {
    return this.propietarioId;
  }
  async listarHistorialEstado(): Promise<HistorialEstadoItem[]> {
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
  return new NextRequest(`http://localhost/api/reportes/${id}/historial`, { method: 'GET' });
}

describe('GET /api/reportes/[id]/historial (Historial de cambios de estado)', () => {
  let repositorioReportes: RepositorioReportesFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioReportes = new RepositorioReportesFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioReportes>('IRepositorioReportes', repositorioReportes);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await GET(crearRequest(REPORTE_ID), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(401);
  });

  it('el dueño del reporte accede a su propio historial, ordenado cronológicamente', async () => {
    autenticarComo(DUENO_ID);
    repositorioReportes.propietarioId = DUENO_ID;

    const respuesta = await GET(crearRequest(REPORTE_ID), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toHaveLength(2);
    expect(new Date(cuerpo[0].registradoEn).getTime()).toBeLessThan(new Date(cuerpo[1].registradoEn).getTime());
  });

  it.each(['municipio', 'administrador'])('rol %s accede al historial aunque no sea el dueño', async (rol) => {
    autenticarComo(AJENO_ID);
    repositorioReportes.propietarioId = DUENO_ID;
    repositorioPerfil.rol = rol;

    const respuesta = await GET(crearRequest(REPORTE_ID), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(200);
  });

  // Paso 4 del checklist: test de integración que confirma 403 para un usuario ajeno al reporte.
  it('rechaza con 403 / PEA-SIS-002 a un usuario ajeno al reporte (ni dueño ni municipio/administrador)', async () => {
    autenticarComo(AJENO_ID);
    repositorioReportes.propietarioId = DUENO_ID;
    repositorioPerfil.rol = 'dueño'; // dueño de OTRO reporte, no de este

    const respuesta = await GET(crearRequest(REPORTE_ID), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it('rechaza un reporte inexistente (404 / PEA-REP-005)', async () => {
    autenticarComo(DUENO_ID);
    repositorioReportes.propietarioId = null;

    const respuesta = await GET(crearRequest(REPORTE_ID), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-005');
  });
});
