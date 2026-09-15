/**
 * @jest-environment node
 */
import { ListarMisProductos } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ListarMisProductos';
import type { IRepositorioProductosVeterinario, PaginaProductos } from '@dominio/puertos/IRepositorioProductosVeterinario';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const veterinarioId = '11111111-1111-1111-1111-111111111111';
const PAGINA_VACIA: PaginaProductos = { items: [], total: 0, pagina: 1, porPagina: 50 };

function crearFakes(rol = 'veterinario') {
  const repositorioProductos: jest.Mocked<IRepositorioProductosVeterinario> = {
    crear: jest.fn(),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
    listarPropios: jest.fn().mockResolvedValue(PAGINA_VACIA),
    listarActivos: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest
      .fn()
      .mockResolvedValue({ id: veterinarioId, email: 'vet@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: new Date() } as ResumenPerfilPropio),
  };
  return { repositorioProductos, repositorioPerfil };
}

describe('ListarMisProductos', () => {
  it('delega en el repositorio con el veterinarioId del solicitante', async () => {
    const { repositorioProductos, repositorioPerfil } = crearFakes();
    const caso = new ListarMisProductos(repositorioProductos, repositorioPerfil);

    await caso.ejecutar({ veterinarioId, pagina: 1, porPagina: 50 });

    expect(repositorioProductos.listarPropios).toHaveBeenCalledWith(veterinarioId, 1, 50);
  });

  it('rechaza con 403 / PEA-SIS-002 a un usuario sin rol veterinario', async () => {
    const { repositorioProductos, repositorioPerfil } = crearFakes('dueño');
    const caso = new ListarMisProductos(repositorioProductos, repositorioPerfil);

    await expect(caso.ejecutar({ veterinarioId, pagina: 1, porPagina: 50 })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
  });
});
