/**
 * @jest-environment node
 */
import { ListarMisPedidos } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ListarMisPedidos';
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
    listarPorComprador: jest.fn().mockResolvedValue(paginaVacia),
    listarPorVeterinario: jest.fn(),
    actualizarEstado: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(perfil),
  };
  return { repositorioPedidos, repositorioPerfil };
}

describe('ListarMisPedidos', () => {
  it('delega en el repositorio con el comprador y la paginación', async () => {
    const { repositorioPedidos, repositorioPerfil } = crearFakes({
      id: 'dueno-1',
      email: 'dueno@ejemplo.test',
      rol: 'dueño',
      estadoVerificacion: 'no_requerido',
      verificadoEn: null,
    });
    const caso = new ListarMisPedidos(repositorioPedidos, repositorioPerfil);

    await caso.ejecutar({ compradorId: 'dueno-1', pagina: 1, porPagina: 20 });

    expect(repositorioPedidos.listarPorComprador).toHaveBeenCalledWith('dueno-1', 1, 20);
  });

  it('rechaza a quien no tiene rol dueño', async () => {
    const { repositorioPedidos, repositorioPerfil } = crearFakes({
      id: 'vet-1',
      email: 'vet@ejemplo.test',
      rol: 'veterinario',
      estadoVerificacion: 'verificado',
      verificadoEn: new Date(),
    });
    const caso = new ListarMisPedidos(repositorioPedidos, repositorioPerfil);

    await expect(caso.ejecutar({ compradorId: 'vet-1', pagina: 1, porPagina: 50 })).rejects.toThrow(
      AccesoNoAutorizadoError,
    );
  });
});
