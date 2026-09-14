/**
 * @jest-environment node
 */
import { ListarProductosActivos } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ListarProductosActivos';
import type { IRepositorioProductosVeterinario, PaginaProductos } from '@dominio/puertos/IRepositorioProductosVeterinario';

const PAGINA: PaginaProductos = {
  items: [{ id: 'p1', veterinarioId: 'vet-1', nombre: 'Antipulgas', descripcion: null, precio: 100, stock: 5, createdAt: new Date() }],
  total: 1,
  pagina: 1,
  porPagina: 50,
};

function crearFakes() {
  const repositorioProductos: jest.Mocked<IRepositorioProductosVeterinario> = {
    crear: jest.fn(),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
    listarPropios: jest.fn(),
    listarActivos: jest.fn().mockResolvedValue(PAGINA),
  };
  return { repositorioProductos };
}

describe('ListarProductosActivos', () => {
  it('es de acceso público (sin chequeo de rol) y delega en el repositorio', async () => {
    const { repositorioProductos } = crearFakes();
    const caso = new ListarProductosActivos(repositorioProductos);

    const resultado = await caso.ejecutar({ pagina: 1, porPagina: 50 });

    expect(resultado).toEqual(PAGINA);
    expect(repositorioProductos.listarActivos).toHaveBeenCalledWith(1, 50);
  });
});
