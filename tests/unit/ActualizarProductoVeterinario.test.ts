/**
 * @jest-environment node
 */
import { ActualizarProductoVeterinario } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ActualizarProductoVeterinario';
import type { IRepositorioProductosVeterinario, ProductoActual, ProductoVeterinario } from '@dominio/puertos/IRepositorioProductosVeterinario';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { ProductoNoDisponibleError } from '@dominio/errores/erroresVeterinariosAvanzados';

const productoId = '11111111-1111-1111-1111-111111111111';
const veterinarioId = '22222222-2222-2222-2222-222222222222';
const otroVeterinarioId = '33333333-3333-3333-3333-333333333333';

const datosValidos = { nombre: 'Antipulgas x3', descripcion: null, precio: 5000, stock: 15 };

function crearFakes(opciones?: { actual?: ProductoActual | null; actualizarDevuelve?: ProductoVeterinario | null }) {
  const actual: ProductoActual | null =
    opciones && 'actual' in opciones ? opciones.actual! : { id: productoId, veterinarioId };

  const productoActualizado: ProductoVeterinario = {
    id: productoId,
    veterinarioId,
    ...datosValidos,
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
  };

  const repositorioProductos: jest.Mocked<IRepositorioProductosVeterinario> = {
    crear: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(actual),
    actualizar: jest
      .fn()
      .mockResolvedValue(opciones && 'actualizarDevuelve' in opciones ? opciones.actualizarDevuelve : productoActualizado),
    darDeBaja: jest.fn(),
    listarPropios: jest.fn(),
    listarActivos: jest.fn(),
  };
  return { repositorioProductos, productoActualizado };
}

describe('ActualizarProductoVeterinario', () => {
  it('Paso 1: actualiza el producto cuando quien invoca es el veterinario dueño', async () => {
    const { repositorioProductos, productoActualizado } = crearFakes();
    const caso = new ActualizarProductoVeterinario(repositorioProductos);

    const resultado = await caso.ejecutar({ datosCrudos: datosValidos, productoId, veterinarioId });

    expect(resultado).toEqual(productoActualizado);
    expect(repositorioProductos.actualizar).toHaveBeenCalledWith(productoId, veterinarioId, datosValidos);
  });

  it('AC: rechaza con 403 / PEA-SIS-002 si quien invoca no es el dueño del producto', async () => {
    const { repositorioProductos } = crearFakes({ actual: { id: productoId, veterinarioId: otroVeterinarioId } });
    const caso = new ActualizarProductoVeterinario(repositorioProductos);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, productoId, veterinarioId })).rejects.toBeInstanceOf(
      AccesoNoAutorizadoError,
    );
    expect(repositorioProductos.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza con 404 / PEA-VETADV-002 si el producto no existe o está soft-deleted', async () => {
    const { repositorioProductos } = crearFakes({ actual: null });
    const caso = new ActualizarProductoVeterinario(repositorioProductos);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, productoId, veterinarioId })).rejects.toBeInstanceOf(
      ProductoNoDisponibleError,
    );
  });

  it('rechaza con 404 / PEA-VETADV-002 si el UPDATE condicionado no afecta ninguna fila (carrera)', async () => {
    const { repositorioProductos } = crearFakes({ actualizarDevuelve: null });
    const caso = new ActualizarProductoVeterinario(repositorioProductos);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, productoId, veterinarioId })).rejects.toBeInstanceOf(
      ProductoNoDisponibleError,
    );
  });
});
