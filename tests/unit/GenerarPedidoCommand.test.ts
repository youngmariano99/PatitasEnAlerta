/**
 * @jest-environment node
 */
import { GenerarPedidoCommand } from '@aplicacion/casos-de-uso/veterinarios-avanzado/GenerarPedidoCommand';
import type { IRepositorioProductosVeterinario, ProductoActual } from '@dominio/puertos/IRepositorioProductosVeterinario';
import type { IRepositorioPedidosProducto, PedidoCreado } from '@dominio/puertos/IRepositorioPedidosProducto';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { ProductoNoDisponibleError, StockInsuficienteError } from '@dominio/errores/erroresVeterinariosAvanzados';

const productoId = '11111111-1111-1111-1111-111111111111';
const compradorId = '22222222-2222-2222-2222-222222222222';
const veterinarioId = '33333333-3333-3333-3333-333333333333';

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: compradorId, email: 'dueno@ejemplo.test', rol, estadoVerificacion: 'no_requerido', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string; actual?: ProductoActual | null; pedidoCreado?: PedidoCreado | null }) {
  const actual: ProductoActual | null =
    opciones && 'actual' in opciones ? opciones.actual! : { id: productoId, veterinarioId };

  const pedidoPorDefecto: PedidoCreado = {
    id: 'pedido-1',
    productoId,
    compradorId,
    cantidad: 2,
    precioUnitario: 4500,
    estado: 'pendiente',
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
  };

  const repositorioProductos: jest.Mocked<IRepositorioProductosVeterinario> = {
    crear: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(actual),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
    listarPropios: jest.fn(),
    listarActivos: jest.fn(),
  };
  const repositorioPedidos: jest.Mocked<IRepositorioPedidosProducto> = {
    crear: jest.fn().mockResolvedValue(opciones && 'pedidoCreado' in opciones ? opciones.pedidoCreado : pedidoPorDefecto),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'dueño')),
  };
  return { repositorioProductos, repositorioPedidos, repositorioPerfil, pedidoPorDefecto };
}

describe('GenerarPedidoCommand', () => {
  it('Paso 2: genera el pedido cuando hay stock suficiente y quien compra es dueño', async () => {
    const { repositorioProductos, repositorioPedidos, repositorioPerfil, pedidoPorDefecto } = crearFakes();
    const caso = new GenerarPedidoCommand(repositorioProductos, repositorioPedidos, repositorioPerfil);

    const resultado = await caso.ejecutar({ datosCrudos: { cantidad: 2 }, productoId, compradorId });

    expect(resultado).toEqual(pedidoPorDefecto);
    expect(repositorioPedidos.crear).toHaveBeenCalledWith({ productoId, compradorId, cantidad: 2 });
  });

  it.each(['veterinario', 'rescatista', 'organizacion', 'municipio', 'administrador', 'comerciante'])(
    'rechaza con 403 / PEA-SIS-002 a un usuario con rol %s',
    async (rol) => {
      const { repositorioProductos, repositorioPedidos, repositorioPerfil } = crearFakes({ rol });
      const caso = new GenerarPedidoCommand(repositorioProductos, repositorioPedidos, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: { cantidad: 1 }, productoId, compradorId })).rejects.toBeInstanceOf(
        AccesoNoAutorizadoError,
      );
      expect(repositorioPedidos.crear).not.toHaveBeenCalled();
    },
  );

  it('rechaza con 404 / PEA-VETADV-002 si el producto no existe o está soft-deleted', async () => {
    const { repositorioProductos, repositorioPedidos, repositorioPerfil } = crearFakes({ actual: null });
    const caso = new GenerarPedidoCommand(repositorioProductos, repositorioPedidos, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: { cantidad: 1 }, productoId, compradorId })).rejects.toBeInstanceOf(
      ProductoNoDisponibleError,
    );
    expect(repositorioPedidos.crear).not.toHaveBeenCalled();
  });

  it('AC: rechaza con 409 / PEA-VETADV-001 si no queda stock suficiente', async () => {
    const { repositorioProductos, repositorioPedidos, repositorioPerfil } = crearFakes({ pedidoCreado: null });
    const caso = new GenerarPedidoCommand(repositorioProductos, repositorioPedidos, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: { cantidad: 100 }, productoId, compradorId })).rejects.toBeInstanceOf(
      StockInsuficienteError,
    );
  });

  it('rechaza cantidad cero o negativa (400, fail-fast vía Zod)', async () => {
    const { repositorioProductos, repositorioPedidos, repositorioPerfil } = crearFakes();
    const caso = new GenerarPedidoCommand(repositorioProductos, repositorioPedidos, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: { cantidad: 0 }, productoId, compradorId })).rejects.toThrow();
    expect(repositorioPedidos.crear).not.toHaveBeenCalled();
  });
});
