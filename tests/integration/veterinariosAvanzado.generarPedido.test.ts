/**
 * @jest-environment node
 *
 * Paso 4 del ticket "CRUD de productos_veterinario y comando
 * GenerarPedidoCommand" (Módulo 6): dos pedidos concurrentes reales
 * (Promise.all, no secuenciales) que agotarían el mismo stock — solo uno
 * tiene éxito. Mismo criterio que
 * tests/integration/turnos.reservar.test.ts (RepositorioTurnosConcurrencia):
 * el fake muta el stock en memoria SIN ningún `await` entre la lectura y la
 * escritura dentro de `crear()`, así que su exclusión mutua ocurre en el
 * mismo punto lógico (`WHERE stock >= cantidad`) que garantizaría el UPDATE
 * condicionado de Postgres frente a dos transacciones concurrentes reales.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  DatosNuevoPedido,
  IRepositorioPedidosProducto,
  PedidoCreado,
} from '@dominio/puertos/IRepositorioPedidosProducto';
import type {
  IRepositorioProductosVeterinario,
  ProductoActual,
} from '@dominio/puertos/IRepositorioProductosVeterinario';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const productoId = '11111111-1111-1111-1111-111111111111';
const veterinarioId = '22222222-2222-2222-2222-222222222222';
const compradorA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const compradorB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// createServerClient se mockea leyendo una cookie propia del test
// ('usuario-simulado') en vez de un getUserMock global compartido: dos
// requests concurrentes (Promise.all) necesitan identificarse como DOS
// usuarios distintos al mismo tiempo — mismo criterio que
// tests/integration/turnos.reservar.test.ts.
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(
    (
      _url: string,
      _key: string,
      opciones: { cookies: { getAll: () => Array<{ name: string; value: string }> } },
    ) => {
      const cookies = opciones.cookies.getAll();
      const usuarioSimulado = cookies.find((c) => c.name === 'usuario-simulado')?.value;
      return {
        auth: {
          getUser: async () =>
            usuarioSimulado
              ? { data: { user: { id: usuarioSimulado } }, error: null }
              : { data: { user: null }, error: { message: 'sin sesión' } },
        },
      };
    },
  ),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/turnos.reservar.test.ts).
import { POST } from '@app/api/veterinarios/productos/[id]/pedidos/route';

class RepositorioProductosFalso implements IRepositorioProductosVeterinario {
  public actual: ProductoActual | null = { id: productoId, veterinarioId };

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async obtenerActual(id: string): Promise<ProductoActual | null> {
    if (id !== productoId) return null;
    return this.actual;
  }

  async actualizar(): Promise<null> {
    return null;
  }

  async darDeBaja(): Promise<boolean> {
    return false;
  }

  async listarPropios(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarActivos(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

/**
 * Único producto en memoria, con `stock` mutado por `crear()` — SIN ningún
 * `await` entre la lectura de `stock` y su decremento (aunque el método
 * esté declarado `async`), a propósito: ver el docstring del archivo.
 */
class RepositorioPedidosConcurrencia implements IRepositorioPedidosProducto {
  private stock: number;
  public intentos: DatosNuevoPedido[] = [];

  constructor(stockInicial: number) {
    this.stock = stockInicial;
  }

  async crear(datos: DatosNuevoPedido): Promise<PedidoCreado | null> {
    this.intentos.push(datos);
    if (datos.productoId !== productoId) return null;
    if (this.stock < datos.cantidad) return null;

    this.stock -= datos.cantidad;
    return {
      id: `pedido-${this.intentos.length}`,
      productoId: datos.productoId,
      compradorId: datos.compradorId,
      cantidad: datos.cantidad,
      precioUnitario: 4500,
      estado: 'pendiente',
      createdAt: new Date('2026-09-15T10:00:00.000Z'),
    };
  }

  get stockRestante(): number {
    return this.stock;
  }

  async listarPorComprador(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarPorVeterinario(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async actualizarEstado(): Promise<null> {
    return null;
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return {
      id: usuarioId,
      email: 'dueno@ejemplo.test',
      rol: 'dueño',
      estadoVerificacion: 'no_requerido',
      verificadoEn: null,
    };
  }
}

function crearRequest(usuarioId: string | null, body: unknown = { cantidad: 3 }): NextRequest {
  return new NextRequest(`http://localhost/api/veterinarios/productos/${productoId}/pedidos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(usuarioId ? { Cookie: `usuario-simulado=${usuarioId}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/veterinarios/productos/[id]/pedidos (GenerarPedidoCommand — control de stock concurrente)', () => {
  let repositorioProductos: RepositorioProductosFalso;
  let repositorioPedidos: RepositorioPedidosConcurrencia;

  beforeEach(() => {
    repositorioProductos = new RepositorioProductosFalso();
    // Stock=3: cada pedido concurrente pide 3 unidades — juntos agotarían 6,
    // el doble de lo disponible, garantizando que solo UNO puede ganar.
    repositorioPedidos = new RepositorioPedidosConcurrencia(3);
    container.reset();
    container.registerInstance<IRepositorioProductosVeterinario>(
      'IRepositorioProductosVeterinario',
      repositorioProductos,
    );
    container.registerInstance<IRepositorioPedidosProducto>(
      'IRepositorioPedidosProducto',
      repositorioPedidos,
    );
    container.registerInstance<IRepositorioPerfil>(
      'IRepositorioPerfil',
      new RepositorioPerfilFalso(),
    );
  });

  it('Verificación técnica / AC: dos pedidos concurrentes reales (Promise.all) sobre el último stock disponible — solo uno tiene éxito', async () => {
    const [respuestaA, respuestaB] = await Promise.all([
      POST(crearRequest(compradorA), { params: { id: productoId } }),
      POST(crearRequest(compradorB), { params: { id: productoId } }),
    ]);

    const estados = [respuestaA.status, respuestaB.status].sort();
    expect(estados).toEqual([201, 409]);

    const ganadora = respuestaA.status === 201 ? respuestaA : respuestaB;
    const perdedora = respuestaA.status === 201 ? respuestaB : respuestaA;

    const cuerpoGanadora = await ganadora.json();
    expect(cuerpoGanadora.estado).toBe('pendiente');
    expect([compradorA, compradorB]).toContain(cuerpoGanadora.compradorId);

    const cuerpoPerdedora = await perdedora.json();
    expect(cuerpoPerdedora.codigo).toBe('PEA-VETADV-001');

    // Ambos intentos SÍ llegaron al UPDATE condicionado (ninguno se
    // descartó antes de tiempo) — la exclusión mutua ocurrió en el WHERE
    // (stock >= cantidad), no por una carrera ya ganada en la capa HTTP.
    expect(repositorioPedidos.intentos).toHaveLength(2);

    // Verificación técnica explícita del AC: el stock nunca queda negativo.
    expect(repositorioPedidos.stockRestante).toBe(0);
    expect(repositorioPedidos.stockRestante).toBeGreaterThanOrEqual(0);
  });

  it('AC: un producto sin stock suficiente responde 409 / PEA-VETADV-001 en un pedido secuencial', async () => {
    const respuesta = await POST(crearRequest(compradorA, { cantidad: 10 }), {
      params: { id: productoId },
    });

    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-VETADV-001');
  });

  it('genera el pedido con éxito (201) cuando hay stock suficiente', async () => {
    const respuesta = await POST(crearRequest(compradorA, { cantidad: 2 }), {
      params: { id: productoId },
    });

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toMatchObject({
      productoId,
      compradorId: compradorA,
      cantidad: 2,
      estado: 'pendiente',
    });
    expect(repositorioPedidos.stockRestante).toBe(1);
  });

  it('responde 401 (PEA-SIS-001) sin sesión', async () => {
    const respuesta = await POST(crearRequest(null), { params: { id: productoId } });

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('responde 404 (PEA-VETADV-002) si el producto no existe', async () => {
    repositorioProductos.actual = null;

    const respuesta = await POST(crearRequest(compradorA), { params: { id: productoId } });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-VETADV-002');
  });
});
