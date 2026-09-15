/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  DatosProducto,
  IRepositorioProductosVeterinario,
  PaginaProductos,
  ProductoActual,
  ProductoVeterinario,
} from '@dominio/puertos/IRepositorioProductosVeterinario';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { GET as listarActivos, POST as crearProducto } from '@app/api/veterinarios/productos/route';
import { GET as listarMisProductos } from '@app/api/veterinarios/productos/mis-productos/route';
import { PATCH as actualizarProducto, DELETE as darDeBajaProducto } from '@app/api/veterinarios/productos/[id]/route';

const productoId = '11111111-1111-1111-1111-111111111111';
const veterinarioId = '22222222-2222-2222-2222-222222222222';
const otroVeterinarioId = '33333333-3333-3333-3333-333333333333';

const productoPersistido: ProductoVeterinario = {
  id: productoId,
  veterinarioId,
  nombre: 'Antipulgas x3',
  descripcion: 'Pipeta mensual',
  precio: 4500,
  stock: 20,
  createdAt: new Date('2026-09-15T10:00:00.000Z'),
};

class RepositorioProductosFalso implements IRepositorioProductosVeterinario {
  public actual: ProductoActual | null = { id: productoId, veterinarioId };
  public creados: Array<{ veterinarioId: string; datos: DatosProducto }> = [];
  public actualizarDevuelve: ProductoVeterinario | null = productoPersistido;
  public darDeBajaDevuelve = true;

  async crear(vetId: string, datos: DatosProducto): Promise<ProductoVeterinario> {
    this.creados.push({ veterinarioId: vetId, datos });
    return { ...productoPersistido, veterinarioId: vetId, ...datos };
  }

  async obtenerActual(): Promise<ProductoActual | null> {
    return this.actual;
  }

  async actualizar(): Promise<ProductoVeterinario | null> {
    return this.actualizarDevuelve;
  }

  async darDeBaja(): Promise<boolean> {
    return this.darDeBajaDevuelve;
  }

  async listarPropios(): Promise<PaginaProductos> {
    return { items: [productoPersistido], total: 1, pagina: 1, porPagina: 50 };
  }

  async listarActivos(): Promise<PaginaProductos> {
    return { items: [productoPersistido], total: 1, pagina: 1, porPagina: 50 };
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'veterinario';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'vet@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: new Date() };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

const datosValidos = { nombre: 'Antipulgas x3', descripcion: 'Pipeta mensual', precio: 4500, stock: 20 };

function crearRequestJson(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('Endpoints de productos_veterinario (Módulo 6, Paso 1: CRUD restringido al veterinario_id propio)', () => {
  let repositorioProductos: RepositorioProductosFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioProductos = new RepositorioProductosFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioProductosVeterinario>('IRepositorioProductosVeterinario', repositorioProductos);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  describe('GET /api/veterinarios/productos (catálogo público)', () => {
    it('responde 200 sin sesión — lectura pública (Patrón B, docs/ROLES.md)', async () => {
      autenticarComo(null);

      const respuesta = await listarActivos(crearRequestJson('/api/veterinarios/productos', 'GET'));

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.total).toBe(1);
    });
  });

  describe('POST /api/veterinarios/productos', () => {
    it('crea el producto con veterinarioId de la sesión (201)', async () => {
      autenticarComo(veterinarioId);

      const respuesta = await crearProducto(crearRequestJson('/api/veterinarios/productos', 'POST', datosValidos));

      expect(respuesta.status).toBe(201);
      expect(repositorioProductos.creados).toEqual([{ veterinarioId, datos: datosValidos }]);
    });

    it('rechaza con 403 / PEA-SIS-002 a un usuario sin rol veterinario', async () => {
      autenticarComo(veterinarioId);
      repositorioPerfil.rol = 'dueño';

      const respuesta = await crearProducto(crearRequestJson('/api/veterinarios/productos', 'POST', datosValidos));

      expect(respuesta.status).toBe(403);
    });
  });

  describe('GET /api/veterinarios/productos/mis-productos', () => {
    it('responde 401 sin sesión', async () => {
      autenticarComo(null);

      const respuesta = await listarMisProductos(crearRequestJson('/api/veterinarios/productos/mis-productos', 'GET'));

      expect(respuesta.status).toBe(401);
    });

    it('devuelve el catálogo propio con sesión de veterinario (200)', async () => {
      autenticarComo(veterinarioId);

      const respuesta = await listarMisProductos(crearRequestJson('/api/veterinarios/productos/mis-productos', 'GET'));

      expect(respuesta.status).toBe(200);
    });
  });

  describe('PATCH /api/veterinarios/productos/[id]', () => {
    it('AC: rechaza con 403 / PEA-SIS-002 cuando el veterinario intenta editar el producto de otro', async () => {
      autenticarComo(otroVeterinarioId);

      const respuesta = await actualizarProducto(
        crearRequestJson(`/api/veterinarios/productos/${productoId}`, 'PATCH', datosValidos),
        { params: { id: productoId } },
      );

      expect(respuesta.status).toBe(403);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-002');
    });

    it('actualiza el producto cuando quien invoca es el dueño (200)', async () => {
      autenticarComo(veterinarioId);

      const respuesta = await actualizarProducto(
        crearRequestJson(`/api/veterinarios/productos/${productoId}`, 'PATCH', datosValidos),
        { params: { id: productoId } },
      );

      expect(respuesta.status).toBe(200);
    });

    it('responde 404 / PEA-VETADV-002 si el producto no existe', async () => {
      autenticarComo(veterinarioId);
      repositorioProductos.actual = null;

      const respuesta = await actualizarProducto(
        crearRequestJson(`/api/veterinarios/productos/${productoId}`, 'PATCH', datosValidos),
        { params: { id: productoId } },
      );

      expect(respuesta.status).toBe(404);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-VETADV-002');
    });
  });

  describe('DELETE /api/veterinarios/productos/[id]', () => {
    it('rechaza con 403 / PEA-SIS-002 al intentar dar de baja el producto de otro veterinario', async () => {
      autenticarComo(otroVeterinarioId);

      const respuesta = await darDeBajaProducto(crearRequestJson(`/api/veterinarios/productos/${productoId}`, 'DELETE'), {
        params: { id: productoId },
      });

      expect(respuesta.status).toBe(403);
    });

    it('da de baja el producto propio (200)', async () => {
      autenticarComo(veterinarioId);

      const respuesta = await darDeBajaProducto(crearRequestJson(`/api/veterinarios/productos/${productoId}`, 'DELETE'), {
        params: { id: productoId },
      });

      expect(respuesta.status).toBe(200);
    });
  });
});
