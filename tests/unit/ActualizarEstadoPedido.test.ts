/**
 * @jest-environment node
 */
import { ActualizarEstadoPedido } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ActualizarEstadoPedido';
import type {
  IRepositorioPedidosProducto,
  PedidoCreado,
} from '@dominio/puertos/IRepositorioPedidosProducto';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { PedidoNoTransicionableError } from '@dominio/errores/erroresVeterinariosAvanzados';

const perfilVeterinario: ResumenPerfilPropio = {
  id: 'vet-1',
  email: 'vet@ejemplo.test',
  rol: 'veterinario',
  estadoVerificacion: 'verificado',
  verificadoEn: new Date(),
};

const pedidoActualizado: PedidoCreado = {
  id: 'pedido-1',
  productoId: 'prod-1',
  compradorId: 'dueno-1',
  cantidad: 2,
  precioUnitario: 1000,
  estado: 'confirmado',
  createdAt: new Date('2026-09-15T10:00:00.000Z'),
};

function crearFakes(
  perfil: ResumenPerfilPropio | null,
  resultadoActualizarEstado: PedidoCreado | null = pedidoActualizado,
) {
  const repositorioPedidos: jest.Mocked<IRepositorioPedidosProducto> = {
    crear: jest.fn(),
    listarPorComprador: jest.fn(),
    listarPorVeterinario: jest.fn(),
    actualizarEstado: jest.fn().mockResolvedValue(resultadoActualizarEstado),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(perfil),
  };
  return { repositorioPedidos, repositorioPerfil };
}

describe('ActualizarEstadoPedido', () => {
  it('confirma un pedido delegando en el repositorio', async () => {
    const { repositorioPedidos, repositorioPerfil } = crearFakes(perfilVeterinario);
    const caso = new ActualizarEstadoPedido(repositorioPedidos, repositorioPerfil);

    const resultado = await caso.ejecutar({
      datosCrudos: { estado: 'confirmado' },
      pedidoId: 'pedido-1',
      veterinarioId: 'vet-1',
    });

    expect(repositorioPedidos.actualizarEstado).toHaveBeenCalledWith(
      'pedido-1',
      'vet-1',
      'confirmado',
    );
    expect(resultado).toEqual(pedidoActualizado);
  });

  it('traduce null del repositorio a PEA-VETADV-004', async () => {
    const { repositorioPedidos, repositorioPerfil } = crearFakes(perfilVeterinario, null);
    const caso = new ActualizarEstadoPedido(repositorioPedidos, repositorioPerfil);

    await expect(
      caso.ejecutar({
        datosCrudos: { estado: 'cancelado' },
        pedidoId: 'pedido-1',
        veterinarioId: 'vet-1',
      }),
    ).rejects.toThrow(PedidoNoTransicionableError);
  });

  it('rechaza a quien no tiene rol veterinario', async () => {
    const { repositorioPedidos, repositorioPerfil } = crearFakes({
      id: 'dueno-1',
      email: 'dueno@ejemplo.test',
      rol: 'dueño',
      estadoVerificacion: 'no_requerido',
      verificadoEn: null,
    });
    const caso = new ActualizarEstadoPedido(repositorioPedidos, repositorioPerfil);

    await expect(
      caso.ejecutar({
        datosCrudos: { estado: 'confirmado' },
        pedidoId: 'pedido-1',
        veterinarioId: 'dueno-1',
      }),
    ).rejects.toThrow(AccesoNoAutorizadoError);
  });

  it('rechaza un payload con un estado no permitido', async () => {
    const { repositorioPedidos, repositorioPerfil } = crearFakes(perfilVeterinario);
    const caso = new ActualizarEstadoPedido(repositorioPedidos, repositorioPerfil);

    await expect(
      caso.ejecutar({
        datosCrudos: { estado: 'entregado' },
        pedidoId: 'pedido-1',
        veterinarioId: 'vet-1',
      }),
    ).rejects.toThrow();
  });
});
