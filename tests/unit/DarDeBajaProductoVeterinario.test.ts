/**
 * @jest-environment node
 */
import { DarDeBajaProductoVeterinario } from '@aplicacion/casos-de-uso/veterinarios-avanzado/DarDeBajaProductoVeterinario';
import type { IRepositorioProductosVeterinario, ProductoActual } from '@dominio/puertos/IRepositorioProductosVeterinario';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { ProductoNoDisponibleError } from '@dominio/errores/erroresVeterinariosAvanzados';

const productoId = '11111111-1111-1111-1111-111111111111';
const veterinarioId = '22222222-2222-2222-2222-222222222222';
const otroVeterinarioId = '33333333-3333-3333-3333-333333333333';

function crearFakes(opciones?: { actual?: ProductoActual | null; darDeBajaDevuelve?: boolean }) {
  const actual: ProductoActual | null =
    opciones && 'actual' in opciones ? opciones.actual! : { id: productoId, veterinarioId };

  const repositorioProductos: jest.Mocked<IRepositorioProductosVeterinario> = {
    crear: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(actual),
    actualizar: jest.fn(),
    darDeBaja: jest.fn().mockResolvedValue(opciones?.darDeBajaDevuelve ?? true),
    listarPropios: jest.fn(),
    listarActivos: jest.fn(),
  };
  return { repositorioProductos };
}

describe('DarDeBajaProductoVeterinario', () => {
  it('Paso 1: da de baja el producto cuando quien invoca es el veterinario dueño', async () => {
    const { repositorioProductos } = crearFakes();
    const caso = new DarDeBajaProductoVeterinario(repositorioProductos);

    const resultado = await caso.ejecutar({ productoId, veterinarioId });

    expect(resultado).toEqual({ id: productoId });
    expect(repositorioProductos.darDeBaja).toHaveBeenCalledWith(productoId, veterinarioId);
  });

  it('rechaza con 403 / PEA-SIS-002 si quien invoca no es el dueño del producto', async () => {
    const { repositorioProductos } = crearFakes({ actual: { id: productoId, veterinarioId: otroVeterinarioId } });
    const caso = new DarDeBajaProductoVeterinario(repositorioProductos);

    await expect(caso.ejecutar({ productoId, veterinarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioProductos.darDeBaja).not.toHaveBeenCalled();
  });

  it('rechaza con 404 / PEA-VETADV-002 si el producto no existe', async () => {
    const { repositorioProductos } = crearFakes({ actual: null });
    const caso = new DarDeBajaProductoVeterinario(repositorioProductos);

    await expect(caso.ejecutar({ productoId, veterinarioId })).rejects.toBeInstanceOf(ProductoNoDisponibleError);
  });
});
