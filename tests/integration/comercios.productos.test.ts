/**
 * @jest-environment node
 *
 * Paso 4 del ticket "CRUD de productos_comercio restringido al comercio
 * propio" (Módulo 7): confirma el rechazo de publicación para un comercio
 * no verificado (PEA-COM-001), más el resto de los AC del CRUD.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  DatosProductoComercio,
  IRepositorioProductosComercio,
  ProductoComercio,
  ProductoComercioActual,
} from '@dominio/puertos/IRepositorioProductosComercio';
import type { ComercioPropio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { POST as publicarProducto } from '@app/api/comercios/productos/route';
import { PATCH as actualizarProducto, DELETE as darDeBajaProducto } from '@app/api/comercios/productos/[id]/route';

const productoId = '33333333-3333-3333-3333-333333333333';
const usuarioId = '11111111-1111-1111-1111-111111111111';
const comercioId = '22222222-2222-2222-2222-222222222222';
const otroUsuarioId = '55555555-5555-5555-5555-555555555555';
const otroComercioId = '44444444-4444-4444-4444-444444444444';

const productoPersistido: ProductoComercio = {
  id: productoId,
  comercioId,
  nombre: 'Balanceado premium 15kg',
  descripcion: 'Alta calidad',
  categoria: 'alimento',
  precio: 15000,
  createdAt: new Date('2026-09-14T10:00:00.000Z'),
};

class RepositorioProductosFalso implements IRepositorioProductosComercio {
  public actual: ProductoComercioActual | null = { id: productoId, comercioId };
  public creados: Array<{ comercioId: string; datos: DatosProductoComercio }> = [];
  public actualizarDevuelve: ProductoComercio | null = productoPersistido;
  public darDeBajaDevuelve = true;

  async crear(comercioIdRecibido: string, datos: DatosProductoComercio): Promise<ProductoComercio> {
    this.creados.push({ comercioId: comercioIdRecibido, datos });
    return { ...productoPersistido, comercioId: comercioIdRecibido, ...datos };
  }

  async obtenerActual(): Promise<ProductoComercioActual | null> {
    return this.actual;
  }

  async actualizar(): Promise<ProductoComercio | null> {
    return this.actualizarDevuelve;
  }

  async darDeBaja(): Promise<boolean> {
    return this.darDeBajaDevuelve;
  }
}

class RepositorioComerciosFalso implements IRepositorioComercios {
  public porUsuario: Record<string, ComercioPropio | null> = {
    [usuarioId]: { id: comercioId, estadoVerificacion: 'verificado' },
    [otroUsuarioId]: { id: otroComercioId, estadoVerificacion: 'verificado' },
  };

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async obtenerPropio(usuarioIdConsultado: string) {
    return this.porUsuario[usuarioIdConsultado] ?? null;
  }

  async listarVerificados(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'comerciante';

  async obtenerPerfilPropio(usuarioIdConsultado: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioIdConsultado, email: 'comercio@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: new Date() };
  }
}

function autenticarComo(usuarioIdSesion: string | null) {
  getUserMock.mockResolvedValue(
    usuarioIdSesion
      ? { data: { user: { id: usuarioIdSesion } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

const datosValidos = { nombre: 'Balanceado premium 15kg', descripcion: 'Alta calidad', categoria: 'alimento', precio: 15000 };

function crearRequestJson(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('Endpoints de productos_comercio (Módulo 7, Paso 1: CRUD restringido al comercio propio)', () => {
  let repositorioProductos: RepositorioProductosFalso;
  let repositorioComercios: RepositorioComerciosFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioProductos = new RepositorioProductosFalso();
    repositorioComercios = new RepositorioComerciosFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioProductosComercio>('IRepositorioProductosComercio', repositorioProductos);
    container.registerInstance<IRepositorioComercios>('IRepositorioComercios', repositorioComercios);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  describe('POST /api/comercios/productos', () => {
    it('publica el producto en el comercio propio (201)', async () => {
      autenticarComo(usuarioId);

      const respuesta = await publicarProducto(crearRequestJson('/api/comercios/productos', 'POST', datosValidos));

      expect(respuesta.status).toBe(201);
      expect(repositorioProductos.creados).toEqual([{ comercioId, datos: datosValidos }]);
    });

    it('AC / Paso 4: rechaza con 403 / PEA-COM-001 cuando el comercio no está verificado', async () => {
      autenticarComo(usuarioId);
      repositorioComercios.porUsuario[usuarioId] = { id: comercioId, estadoVerificacion: 'pendiente' };

      const respuesta = await publicarProducto(crearRequestJson('/api/comercios/productos', 'POST', datosValidos));

      expect(respuesta.status).toBe(403);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-COM-001');
      expect(repositorioProductos.creados).toHaveLength(0);
    });

    it('rechaza con 403 / PEA-SIS-002 a un usuario sin rol comerciante', async () => {
      autenticarComo(usuarioId);
      repositorioPerfil.rol = 'dueño';

      const respuesta = await publicarProducto(crearRequestJson('/api/comercios/productos', 'POST', datosValidos));

      expect(respuesta.status).toBe(403);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-002');
    });

    it('responde 404 / PEA-COM-003 si el comerciante no tiene comercio registrado', async () => {
      autenticarComo(usuarioId);
      repositorioComercios.porUsuario[usuarioId] = null;

      const respuesta = await publicarProducto(crearRequestJson('/api/comercios/productos', 'POST', datosValidos));

      expect(respuesta.status).toBe(404);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-COM-003');
    });
  });

  describe('PATCH /api/comercios/productos/[id]', () => {
    it('AC: rechaza con 403 cuando el comerciante intenta editar el producto de otro comercio', async () => {
      autenticarComo(otroUsuarioId);

      const respuesta = await actualizarProducto(
        crearRequestJson(`/api/comercios/productos/${productoId}`, 'PATCH', datosValidos),
        { params: { id: productoId } },
      );

      expect(respuesta.status).toBe(403);
    });

    it('actualiza el producto cuando quien invoca es el dueño (200)', async () => {
      autenticarComo(usuarioId);

      const respuesta = await actualizarProducto(
        crearRequestJson(`/api/comercios/productos/${productoId}`, 'PATCH', datosValidos),
        { params: { id: productoId } },
      );

      expect(respuesta.status).toBe(200);
    });

    it('responde 404 / PEA-COM-004 si el producto no existe', async () => {
      autenticarComo(usuarioId);
      repositorioProductos.actual = null;

      const respuesta = await actualizarProducto(
        crearRequestJson(`/api/comercios/productos/${productoId}`, 'PATCH', datosValidos),
        { params: { id: productoId } },
      );

      expect(respuesta.status).toBe(404);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-COM-004');
    });
  });

  describe('DELETE /api/comercios/productos/[id]', () => {
    it('rechaza con 403 al intentar dar de baja el producto de otro comercio', async () => {
      autenticarComo(otroUsuarioId);

      const respuesta = await darDeBajaProducto(crearRequestJson(`/api/comercios/productos/${productoId}`, 'DELETE'), {
        params: { id: productoId },
      });

      expect(respuesta.status).toBe(403);
    });

    it('da de baja el producto propio (200)', async () => {
      autenticarComo(usuarioId);

      const respuesta = await darDeBajaProducto(crearRequestJson(`/api/comercios/productos/${productoId}`, 'DELETE'), {
        params: { id: productoId },
      });

      expect(respuesta.status).toBe(200);
    });
  });
});
