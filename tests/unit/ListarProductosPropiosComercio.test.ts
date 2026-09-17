/**
 * @jest-environment node
 */
import { ListarProductosPropiosComercio } from '@aplicacion/casos-de-uso/comercios/ListarProductosPropiosComercio';
import type { ComercioPropio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import type {
  IRepositorioProductosComercio,
  ProductoComercio,
} from '@dominio/puertos/IRepositorioProductosComercio';
import { ComercioPropioNoEncontradoError } from '@dominio/errores/erroresComercios';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const comercioId = '22222222-2222-2222-2222-222222222222';

const productoBase: ProductoComercio = {
  id: 'producto-1',
  comercioId,
  nombre: 'Alimento premium',
  descripcion: null,
  categoria: 'alimento',
  precio: 15000,
  createdAt: new Date('2026-09-14T10:00:00.000Z'),
};

function crearFakes(opciones?: {
  comercio?: ComercioPropio | null;
  productos?: ProductoComercio[];
}) {
  const comercio: ComercioPropio | null =
    opciones?.comercio === undefined
      ? { id: comercioId, estadoVerificacion: 'verificado' }
      : opciones.comercio;

  const repositorioComercios: jest.Mocked<IRepositorioComercios> = {
    crear: jest.fn(),
    obtenerPropio: jest.fn().mockResolvedValue(comercio),
    listarVerificados: jest.fn(),
  };
  const repositorioProductos: jest.Mocked<IRepositorioProductosComercio> = {
    crear: jest.fn(),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
    listarPorComercio: jest.fn().mockResolvedValue(opciones?.productos ?? [productoBase]),
  };
  return { repositorioComercios, repositorioProductos };
}

describe('ListarProductosPropiosComercio', () => {
  it('devuelve el catálogo del comercio propio', async () => {
    const { repositorioComercios, repositorioProductos } = crearFakes();
    const caso = new ListarProductosPropiosComercio(repositorioProductos, repositorioComercios);

    const resultado = await caso.ejecutar(usuarioId);

    expect(resultado).toEqual([productoBase]);
    expect(repositorioProductos.listarPorComercio).toHaveBeenCalledWith(comercioId);
  });

  it('responde 404 / PEA-COM-003 si el usuario no tiene comercio registrado', async () => {
    const { repositorioComercios, repositorioProductos } = crearFakes({ comercio: null });
    const caso = new ListarProductosPropiosComercio(repositorioProductos, repositorioComercios);

    await expect(caso.ejecutar(usuarioId)).rejects.toBeInstanceOf(ComercioPropioNoEncontradoError);
    expect(repositorioProductos.listarPorComercio).not.toHaveBeenCalled();
  });

  it('devuelve un arreglo vacío si el comercio no tiene productos', async () => {
    const { repositorioComercios, repositorioProductos } = crearFakes({ productos: [] });
    const caso = new ListarProductosPropiosComercio(repositorioProductos, repositorioComercios);

    await expect(caso.ejecutar(usuarioId)).resolves.toEqual([]);
  });
});
