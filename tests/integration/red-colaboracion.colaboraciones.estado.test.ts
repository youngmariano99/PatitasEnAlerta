/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { ColaboracionActual, ColaboracionEstadoActualizado, IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que
// tests/integration/red-colaboracion.directorio.listar.test.ts.
import { PATCH } from '@app/api/red-colaboracion/colaboraciones/[id]/estado/route';

const COLABORACION_ID = '11111111-1111-1111-1111-111111111111';
const ORGANIZACION_ID = '22222222-2222-2222-2222-222222222222';
const STAKEHOLDER_ID = '33333333-3333-3333-3333-333333333333';
const AJENO_ID = '44444444-4444-4444-4444-444444444444';

class RepositorioColaboracionesFalso implements IRepositorioColaboraciones {
  public actual: ColaboracionActual | null = { estado: 'propuesta', organizacionId: ORGANIZACION_ID, stakeholderId: STAKEHOLDER_ID };
  public llamadasActualizar: Array<{ id: string; estado: string; usuarioId: string }> = [];

  async obtenerActual(): Promise<ColaboracionActual | null> {
    return this.actual;
  }

  async actualizarEstado(id: string, estadoNuevo: string, actualizadoPor: string): Promise<ColaboracionEstadoActualizado> {
    this.llamadasActualizar.push({ id, estado: estadoNuevo, usuarioId: actualizadoPor });
    const estadoAnterior = this.actual!.estado;
    this.actual = { ...this.actual!, estado: estadoNuevo };
    return { id, estado: estadoNuevo, estadoAnterior };
  }

  async listarHistorialEstado(): Promise<never[]> {
    throw new Error('no usado en este test');
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/red-colaboracion/colaboraciones/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/red-colaboracion/colaboraciones/[id]/estado (Hilo de coordinación)', () => {
  let repositorioColaboraciones: RepositorioColaboracionesFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioColaboraciones = new RepositorioColaboracionesFalso();
    container.reset();
    container.registerInstance<IRepositorioColaboraciones>('IRepositorioColaboraciones', repositorioColaboraciones);
  });

  it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await PATCH(crearRequest(COLABORACION_ID, { estado: 'aceptada' }), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(401);
    expect(repositorioColaboraciones.llamadasActualizar).toHaveLength(0);
  });

  it('la organización dueña de la solicitud cambia el estado con éxito', async () => {
    autenticarComo(ORGANIZACION_ID);

    const respuesta = await PATCH(crearRequest(COLABORACION_ID, { estado: 'aceptada' }), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ id: COLABORACION_ID, estado: 'aceptada', estadoAnterior: 'propuesta' });
    expect(repositorioColaboraciones.llamadasActualizar).toEqual([
      { id: COLABORACION_ID, estado: 'aceptada', usuarioId: ORGANIZACION_ID },
    ]);
  });

  it('rechaza con 403 / PEA-RED-004 a un usuario que no es la organización dueña', async () => {
    autenticarComo(AJENO_ID);

    const respuesta = await PATCH(crearRequest(COLABORACION_ID, { estado: 'aceptada' }), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-RED-004');
    expect(repositorioColaboraciones.llamadasActualizar).toHaveLength(0);
  });

  it('rechaza con 403 / PEA-RED-004 incluso al propio stakeholder que propuso la colaboración', async () => {
    autenticarComo(STAKEHOLDER_ID);

    const respuesta = await PATCH(crearRequest(COLABORACION_ID, { estado: 'aceptada' }), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(403);
  });

  it('rechaza una transición inválida (409 / PEA-RED-006)', async () => {
    autenticarComo(ORGANIZACION_ID);
    repositorioColaboraciones.actual = { estado: 'propuesta', organizacionId: ORGANIZACION_ID, stakeholderId: STAKEHOLDER_ID };

    const respuesta = await PATCH(crearRequest(COLABORACION_ID, { estado: 'completada' }), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-RED-006');
  });

  it('rechaza una colaboración inexistente (404 / PEA-RED-005)', async () => {
    autenticarComo(ORGANIZACION_ID);
    repositorioColaboraciones.actual = null;

    const respuesta = await PATCH(crearRequest(COLABORACION_ID, { estado: 'aceptada' }), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-RED-005');
  });

  it('rechaza un estado fuera de catálogo (400 / PEA-SIS-005)', async () => {
    autenticarComo(ORGANIZACION_ID);

    const respuesta = await PATCH(crearRequest(COLABORACION_ID, { estado: 'inventado' }), { params: { id: COLABORACION_ID } });

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });
});
