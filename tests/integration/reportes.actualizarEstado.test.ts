/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioReportes, ReporteEstadoActualizado } from '@dominio/puertos/IRepositorioReportes';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { PATCH } from '@app/api/reportes/[id]/estado/route';

class RepositorioReportesFalso implements IRepositorioReportes {
  public estadoActual: string | null = 'reportado';
  public llamadasActualizar: Array<{ id: string; estado: string; usuarioId: string }> = [];

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
    return this.estadoActual;
  }

  async actualizarEstado(id: string, estadoNuevo: string, actualizadoPor: string): Promise<ReporteEstadoActualizado> {
    this.llamadasActualizar.push({ id, estado: estadoNuevo, usuarioId: actualizadoPor });
    const estadoAnterior = this.estadoActual!;
    this.estadoActual = estadoNuevo;
    return { id, estado: estadoNuevo, estadoAnterior };
  }

  async obtenerPropietario(): Promise<string | null> {
    throw new Error('no usado en este test');
  }

  async listarHistorialEstado(): Promise<never[]> {
    throw new Error('no usado en este test');
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'municipio';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'municipio@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: null };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/reportes/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const REPORTE_ID = '11111111-1111-1111-1111-111111111111';
const MUNICIPIO_ID = '22222222-2222-2222-2222-222222222222';

describe('PATCH /api/reportes/[id]/estado (Panel municipal — cambio de estado)', () => {
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

    const respuesta = await PATCH(crearRequest(REPORTE_ID, { estado: 'en_revision' }), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(401);
    expect(repositorioReportes.llamadasActualizar).toHaveLength(0);
  });

  it.each(['dueño', 'veterinario'])('rechaza con 403 / PEA-REP-007 para rol %s', async (rol) => {
    autenticarComo(MUNICIPIO_ID);
    repositorioPerfil.rol = rol;

    const respuesta = await PATCH(crearRequest(REPORTE_ID, { estado: 'en_revision' }), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-007');
    expect(repositorioReportes.llamadasActualizar).toHaveLength(0);
  });

  it('municipio cambia el estado con éxito y queda registrado el historial (vía el repositorio)', async () => {
    autenticarComo(MUNICIPIO_ID);

    const respuesta = await PATCH(crearRequest(REPORTE_ID, { estado: 'en_revision' }), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ id: REPORTE_ID, estado: 'en_revision', estadoAnterior: 'reportado' });
    expect(repositorioReportes.llamadasActualizar).toEqual([{ id: REPORTE_ID, estado: 'en_revision', usuarioId: MUNICIPIO_ID }]);
  });

  it('administrador también puede cambiar el estado', async () => {
    autenticarComo(MUNICIPIO_ID);
    repositorioPerfil.rol = 'administrador';

    const respuesta = await PATCH(crearRequest(REPORTE_ID, { estado: 'en_revision' }), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(200);
  });

  it('rechaza una transición inválida (409 / PEA-REP-006)', async () => {
    autenticarComo(MUNICIPIO_ID);
    repositorioReportes.estadoActual = 'reportado';

    const respuesta = await PATCH(crearRequest(REPORTE_ID, { estado: 'resuelto' }), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-006');
  });

  it('rechaza un reporte inexistente (404 / PEA-REP-005)', async () => {
    autenticarComo(MUNICIPIO_ID);
    repositorioReportes.estadoActual = null;

    const respuesta = await PATCH(crearRequest(REPORTE_ID, { estado: 'en_revision' }), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-005');
  });

  it('rechaza un estado fuera de catálogo (400 / PEA-SIS-005)', async () => {
    autenticarComo(MUNICIPIO_ID);

    const respuesta = await PATCH(crearRequest(REPORTE_ID, { estado: 'inventado' }), { params: { id: REPORTE_ID } });

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });
});
