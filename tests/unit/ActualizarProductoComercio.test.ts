/**
 * @jest-environment node
 */
import { ActualizarProductoComercio } from '@aplicacion/casos-de-uso/comercios/ActualizarProductoComercio';
import type {
  IRepositorioProductosComercio,
  ProductoComercio,
  ProductoComercioActual,
} from '@dominio/puertos/IRepositorioProductosComercio';
import type { ComercioPropio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import { ProductoComercioNoEncontradoError } from '@dominio/errores/erroresComercios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const productoId = '33333333-3333-3333-3333-333333333333';
const usuarioId = '11111111-1111-1111-1111-111111111111';
const comercioId = '22222222-2222-2222-2222-222222222222';
const otroComercioId = '44444444-4444-4444-4444-444444444444';

const datosValidos = { nombre: 'Correa reforzada', descripcion: '<b>Resistente</b>', categoria: 'accesorios', precio: 3500 };

function crearActual(comercioIdDelProducto = comercioId): ProductoComercioActual {
  return { id: productoId, comercioId: comercioIdDelProducto };
}

function crearFakes(opciones?: { actual?: ProductoComercioActual | null; comercio?: ComercioPropio | null }) {
  const productoActualizado: ProductoComercio = {
    id: productoId,
    comercioId,
    nombre: datosValidos.nombre,
    descripcion: 'Resistente',
    categoria: datosValidos.categoria,
    precio: datosValidos.precio,
    createdAt: new Date('2026-09-14T10:00:00.000Z'),
  };
  const repositorioProductos: jest.Mocked<IRepositorioProductosComercio> = {
    crear: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(opciones?.actual === undefined ? crearActual() : opciones.actual),
    actualizar: jest.fn().mockResolvedValue(productoActualizado),
    darDeBaja: jest.fn(),
  };
  const repositorioComercios: jest.Mocked<IRepositorioComercios> = {
    crear: jest.fn(),
    obtenerPropio: jest.fn().mockResolvedValue(opciones?.comercio === undefined ? { id: comercioId, estadoVerificacion: 'verificado' } : opciones.comercio),
    listarVerificados: jest.fn(),
  };
  return { repositorioProductos, repositorioComercios, productoActualizado };
}

describe('ActualizarProductoComercio', () => {
  it('Paso 1: actualiza el producto cuando el comercio propio coincide con el dueño del producto', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes();
    const caso = new ActualizarProductoComercio(repositorioProductos, repositorioComercios);

    const resultado = await caso.ejecutar({ datosCrudos: datosValidos, productoId, usuarioId });

    expect(resultado.id).toBe(productoId);
    expect(repositorioProductos.actualizar).toHaveBeenCalledWith(productoId, comercioId, {
      nombre: datosValidos.nombre,
      descripcion: 'Resistente',
      categoria: datosValidos.categoria,
      precio: datosValidos.precio,
    });
  });

  it('Paso 3: sanitiza la descripción con DOMPurify antes de persistir', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes();
    const caso = new ActualizarProductoComercio(repositorioProductos, repositorioComercios);

    await caso.ejecutar({ datosCrudos: datosValidos, productoId, usuarioId });

    const [, , datosEnviados] = repositorioProductos.actualizar.mock.calls[0]!;
    expect(datosEnviados.descripcion).not.toContain('<b>');
  });

  it('AC: rechaza con 403 / PEA-SIS-002 cuando el producto pertenece a otro comercio', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes({ actual: crearActual(otroComercioId) });
    const caso = new ActualizarProductoComercio(repositorioProductos, repositorioComercios);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, productoId, usuarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioProductos.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza con 403 / PEA-SIS-002 cuando quien invoca no tiene ningún comercio propio', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes({ comercio: null });
    const caso = new ActualizarProductoComercio(repositorioProductos, repositorioComercios);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, productoId, usuarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
  });

  it('responde 404 / PEA-COM-004 si el producto no existe', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes({ actual: null });
    const caso = new ActualizarProductoComercio(repositorioProductos, repositorioComercios);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, productoId, usuarioId })).rejects.toBeInstanceOf(ProductoComercioNoEncontradoError);
  });

  it('responde 404 / PEA-COM-004 si el UPDATE condicionado no afecta ninguna fila (carrera entre autorizar y persistir)', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes();
    repositorioProductos.actualizar.mockResolvedValue(null);
    const caso = new ActualizarProductoComercio(repositorioProductos, repositorioComercios);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, productoId, usuarioId })).rejects.toBeInstanceOf(ProductoComercioNoEncontradoError);
  });
});
