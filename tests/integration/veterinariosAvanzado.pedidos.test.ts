/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  EstadoPedidoTransicionable,
  IRepositorioPedidosProducto,
  PaginaPedidos,
  PedidoCreado,
} from '@dominio/puertos/IRepositorioPedidosProducto';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { GET as listarMisPedidos } from '@app/api/veterinarios/productos/mis-pedidos/route';
import { GET as listarPedidosRecibidos } from '@app/api/veterinarios/pedidos-recibidos/route';
import { PATCH as actualizarEstadoPedido } from '@app/api/veterinarios/pedidos-recibidos/[id]/route';

const compradorId = '11111111-1111-1111-1111-111111111111';
const veterinarioId = '22222222-2222-2222-2222-222222222222';
const pedidoId = '33333333-3333-3333-3333-333333333333';

const paginaVacia: PaginaPedidos = { items: [], total: 0, pagina: 1, porPagina: 50 };

const pedidoActualizado: PedidoCreado = {
  id: pedidoId,
  productoId: '44444444-4444-4444-4444-444444444444',
  compradorId,
  cantidad: 2,
  precioUnitario: 1000,
  estado: 'confirmado',
  createdAt: new Date('2026-09-15T10:00:00.000Z'),
};

class RepositorioPedidosFalso implements IRepositorioPedidosProducto {
  public actualizarEstadoDevuelve: PedidoCreado | null = pedidoActualizado;

  async crear(): Promise<PedidoCreado | null> {
    return null;
  }

  async listarPorComprador(): Promise<PaginaPedidos> {
    return paginaVacia;
  }

  async listarPorVeterinario(): Promise<PaginaPedidos> {
    return paginaVacia;
  }

  async actualizarEstado(
    _pedidoId: string,
    _veterinarioId: string,
    _nuevoEstado: EstadoPedidoTransicionable,
  ): Promise<PedidoCreado | null> {
    return this.actualizarEstadoDevuelve;
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'dueño';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return {
      id: usuarioId,
      email: 'usuario@ejemplo.test',
      rol: this.rol,
      estadoVerificacion: 'no_requerido',
      verificadoEn: null,
    };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId
      ? { data: { user: { id: usuarioId } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequestJson(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('Endpoints del ciclo de vida de pedidos_producto (Módulo 6)', () => {
  let repositorioPedidos: RepositorioPedidosFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioPedidos = new RepositorioPedidosFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioPedidosProducto>(
      'IRepositorioPedidosProducto',
      repositorioPedidos,
    );
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  describe('GET /api/veterinarios/productos/mis-pedidos', () => {
    it('responde 401 sin sesión', async () => {
      autenticarComo(null);

      const respuesta = await listarMisPedidos(
        crearRequestJson('/api/veterinarios/productos/mis-pedidos', 'GET'),
      );

      expect(respuesta.status).toBe(401);
    });

    it('devuelve la página de pedidos propios con sesión de dueño (200)', async () => {
      autenticarComo(compradorId);

      const respuesta = await listarMisPedidos(
        crearRequestJson('/api/veterinarios/productos/mis-pedidos', 'GET'),
      );

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.total).toBe(0);
    });

    it('rechaza con 403 / PEA-SIS-002 a un usuario sin rol dueño', async () => {
      autenticarComo(compradorId);
      repositorioPerfil.rol = 'veterinario';

      const respuesta = await listarMisPedidos(
        crearRequestJson('/api/veterinarios/productos/mis-pedidos', 'GET'),
      );

      expect(respuesta.status).toBe(403);
    });
  });

  describe('GET /api/veterinarios/pedidos-recibidos', () => {
    it('responde 401 sin sesión', async () => {
      autenticarComo(null);

      const respuesta = await listarPedidosRecibidos(
        crearRequestJson('/api/veterinarios/pedidos-recibidos', 'GET'),
      );

      expect(respuesta.status).toBe(401);
    });

    it('devuelve la página de pedidos recibidos con sesión de veterinario (200)', async () => {
      autenticarComo(veterinarioId);
      repositorioPerfil.rol = 'veterinario';

      const respuesta = await listarPedidosRecibidos(
        crearRequestJson('/api/veterinarios/pedidos-recibidos', 'GET'),
      );

      expect(respuesta.status).toBe(200);
    });
  });

  describe('PATCH /api/veterinarios/pedidos-recibidos/[id]', () => {
    it('confirma un pedido propio (200)', async () => {
      autenticarComo(veterinarioId);
      repositorioPerfil.rol = 'veterinario';

      const respuesta = await actualizarEstadoPedido(
        crearRequestJson(`/api/veterinarios/pedidos-recibidos/${pedidoId}`, 'PATCH', {
          estado: 'confirmado',
        }),
        { params: { id: pedidoId } },
      );

      expect(respuesta.status).toBe(200);
    });

    it('responde 409 / PEA-VETADV-004 si el pedido ya no es transicionable', async () => {
      autenticarComo(veterinarioId);
      repositorioPerfil.rol = 'veterinario';
      repositorioPedidos.actualizarEstadoDevuelve = null;

      const respuesta = await actualizarEstadoPedido(
        crearRequestJson(`/api/veterinarios/pedidos-recibidos/${pedidoId}`, 'PATCH', {
          estado: 'cancelado',
        }),
        { params: { id: pedidoId } },
      );

      expect(respuesta.status).toBe(409);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-VETADV-004');
    });

    it('rechaza con 400 / PEA-SIS-005 un estado no soportado', async () => {
      autenticarComo(veterinarioId);
      repositorioPerfil.rol = 'veterinario';

      const respuesta = await actualizarEstadoPedido(
        crearRequestJson(`/api/veterinarios/pedidos-recibidos/${pedidoId}`, 'PATCH', {
          estado: 'entregado',
        }),
        { params: { id: pedidoId } },
      );

      expect(respuesta.status).toBe(400);
    });
  });
});
