/**
 * @jest-environment node
 */
import { ListarPedidosRecibidos } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ListarPedidosRecibidos';
import type {
  IRepositorioPedidosProducto,
  PaginaPedidos,
} from '@dominio/puertos/IRepositorioPedidosProducto';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const paginaVacia: PaginaPedidos = { items: [], total: 0, pagina: 1, porPagina: 50 };

function crearFakes(perfil: ResumenPerfilPropio | null) {
  const repositorioPedidos: jest.Mocked<IRepositorioPedidosProducto> = {
    crear: jest.fn(),
    listarPorComprador: jest.fn(),
    listarPorVeterinario: jest.fn().mockResolvedValue(paginaVacia),
    actualizarEstado: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(perfil),
  };
  return { repositorioPedidos, repositorioPerfil };
}

describe('ListarPedidosRecibidos', () => {
  it('delega en el repositorio con el veterinario y la paginación', async () => {
    const { repositorioPedidos, repositorioPerfil } = crearFakes({
      id: 'vet-1',
      email: 'vet@ejemplo.test',
      rol: 'veterinario',
      estadoVerificacion: 'verificado',
      verificadoEn: new Date(),
    });
    const caso = new ListarPedidosRecibidos(repositorioPedidos, repositorioPerfil);

    await caso.ejecutar({ veterinarioId: 'vet-1', pagina: 2, porPagina: 10 });

    expect(repositorioPedidos.listarPorVeterinario).toHaveBeenCalledWith('vet-1', 2, 10);
  });

  it('rechaza a quien no tiene rol veterinario', async () => {
    const { repositorioPedidos, repositorioPerfil } = crearFakes({
      id: 'dueno-1',
      email: 'dueno@ejemplo.test',
      rol: 'dueño',
      estadoVerificacion: 'no_requerido',
      verificadoEn: null,
    });
    const caso = new ListarPedidosRecibidos(repositorioPedidos, repositorioPerfil);

    await expect(
      caso.ejecutar({ veterinarioId: 'dueno-1', pagina: 1, porPagina: 50 }),
    ).rejects.toThrow(AccesoNoAutorizadoError);
  });
});
