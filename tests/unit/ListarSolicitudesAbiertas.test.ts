/**
 * @jest-environment node
 */
import { ListarSolicitudesAbiertas } from '@aplicacion/casos-de-uso/red-colaboracion/ListarSolicitudesAbiertas';
import type {
  IRepositorioSolicitudesRecurso,
  PaginaSolicitudesVeterinarias,
} from '@dominio/puertos/IRepositorioSolicitudesRecurso';

const paginaVacia: PaginaSolicitudesVeterinarias = {
  items: [],
  total: 0,
  pagina: 1,
  porPagina: 50,
};

function crearFakes(pagina: PaginaSolicitudesVeterinarias = paginaVacia) {
  const repositorioSolicitudes: jest.Mocked<IRepositorioSolicitudesRecurso> = {
    crear: jest.fn(),
    obtenerActual: jest.fn(),
    listarAsistenciaVeterinariaAbiertas: jest.fn(),
    listarAbiertas: jest.fn().mockResolvedValue(pagina),
  };
  return { repositorioSolicitudes };
}

describe('ListarSolicitudesAbiertas', () => {
  it('delega en el repositorio con pagina/porPagina', async () => {
    const { repositorioSolicitudes } = crearFakes();
    const caso = new ListarSolicitudesAbiertas(repositorioSolicitudes);

    await caso.ejecutar({ pagina: 2, porPagina: 20 });

    expect(repositorioSolicitudes.listarAbiertas).toHaveBeenCalledWith(2, 20);
  });

  it('AC (verificación técnica): no requiere ninguna verificación de rol (autorizar es no-op)', async () => {
    const { repositorioSolicitudes } = crearFakes();
    const caso = new ListarSolicitudesAbiertas(repositorioSolicitudes);

    await expect(caso.ejecutar({ pagina: 1, porPagina: 50 })).resolves.toEqual(paginaVacia);
  });
});
