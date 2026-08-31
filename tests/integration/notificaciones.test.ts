/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { INotificacionesRepositorio, NotificacionListada, PaginaNotificaciones } from '@dominio/puertos/INotificacionesRepositorio';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { GET } from '@app/api/notificaciones/route';
import { PATCH } from '@app/api/notificaciones/[id]/route';

class RepositorioNotificacionesFalso implements INotificacionesRepositorio {
  public marcadasComoLeidas: Array<{ id: string; usuarioId: string }> = [];
  public paginaARetornar: PaginaNotificaciones = { items: [], total: 0, pagina: 1, porPagina: 50, noLeidas: 0 };
  public permitirMarcarComoLeida = true;

  async crear(): Promise<void> {
    throw new Error('no usado en este test');
  }

  async listarPorUsuario(): Promise<PaginaNotificaciones> {
    return this.paginaARetornar;
  }

  async marcarComoLeida(id: string, usuarioId: string): Promise<boolean> {
    this.marcadasComoLeidas.push({ id, usuarioId });
    return this.permitirMarcarComoLeida;
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearNotificacion(overrides: Partial<NotificacionListada> = {}): NotificacionListada {
  return {
    id: 'notif-1',
    tipo: 'reporte_coincidente',
    referenciaTabla: 'reportes',
    referenciaId: 'reporte-1',
    leido: false,
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('Notificaciones — GET /api/notificaciones y PATCH /api/notificaciones/[id]', () => {
  let repositorioNotificaciones: RepositorioNotificacionesFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioNotificaciones = new RepositorioNotificacionesFalso();
    container.reset();
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', repositorioNotificaciones);
  });

  describe('GET /api/notificaciones', () => {
    it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
      autenticarComo(null);

      const respuesta = await GET(new NextRequest('http://localhost/api/notificaciones'));

      expect(respuesta.status).toBe(401);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-001');
    });

    it('devuelve la bandeja propia con el conteo de no leídas', async () => {
      autenticarComo('usuario-1');
      repositorioNotificaciones.paginaARetornar = {
        items: [crearNotificacion()],
        total: 1,
        pagina: 1,
        porPagina: 50,
        noLeidas: 1,
      };

      const respuesta = await GET(new NextRequest('http://localhost/api/notificaciones'));

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.items).toHaveLength(1);
      expect(cuerpo.noLeidas).toBe(1);
    });
  });

  describe('PATCH /api/notificaciones/[id]', () => {
    function crearRequestPatch(): NextRequest {
      return new NextRequest('http://localhost/api/notificaciones/notif-1', { method: 'PATCH' });
    }

    it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
      autenticarComo(null);

      const respuesta = await PATCH(crearRequestPatch(), { params: { id: 'notif-1' } });

      expect(respuesta.status).toBe(401);
    });

    it('marca la notificación propia como leída y lo persiste', async () => {
      const usuarioId = '22222222-2222-2222-2222-222222222222';
      autenticarComo(usuarioId);
      const id = '11111111-1111-1111-1111-111111111111';

      const respuesta = await PATCH(
        new NextRequest(`http://localhost/api/notificaciones/${id}`, { method: 'PATCH' }),
        { params: { id } },
      );

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo).toEqual({ id, leido: true });
      expect(repositorioNotificaciones.marcadasComoLeidas).toEqual([{ id, usuarioId }]);
    });

    it('responde 403 / PEA-SIS-002 (anti-enumeración) para una notificación ajena o inexistente', async () => {
      autenticarComo('22222222-2222-2222-2222-222222222222');
      repositorioNotificaciones.permitirMarcarComoLeida = false;
      const id = '11111111-1111-1111-1111-111111111111';

      const respuesta = await PATCH(
        new NextRequest(`http://localhost/api/notificaciones/${id}`, { method: 'PATCH' }),
        { params: { id } },
      );

      expect(respuesta.status).toBe(403);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-002');
    });

    it('rechaza un id que no es un UUID válido (400 / PEA-SIS-005)', async () => {
      autenticarComo('22222222-2222-2222-2222-222222222222');

      const respuesta = await PATCH(crearRequestPatch(), { params: { id: 'no-es-un-uuid' } });

      expect(respuesta.status).toBe(400);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-005');
    });
  });
});
