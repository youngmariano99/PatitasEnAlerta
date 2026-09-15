/**
 * @jest-environment node
 */
import { DarDeBajaProductoComercio } from '@aplicacion/casos-de-uso/comercios/DarDeBajaProductoComercio';
import type { IRepositorioProductosComercio, ProductoComercioActual } from '@dominio/puertos/IRepositorioProductosComercio';
import type { ComercioPropio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import { ProductoComercioNoEncontradoError } from '@dominio/errores/erroresComercios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const productoId = '33333333-3333-3333-3333-333333333333';
const usuarioId = '11111111-1111-1111-1111-111111111111';
const comercioId = '22222222-2222-2222-2222-222222222222';
const otroComercioId = '44444444-4444-4444-4444-444444444444';

function crearFakes(opciones?: { actual?: ProductoComercioActual | null; comercio?: ComercioPropio | null; darDeBajaOk?: boolean }) {
  const actual: ProductoComercioActual | null = opciones?.actual === undefined ? { id: productoId, comercioId } : opciones.actual;
  const repositorioProductos: jest.Mocked<IRepositorioProductosComercio> = {
    crear: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(actual),
    actualizar: jest.fn(),
    darDeBaja: jest.fn().mockResolvedValue(opciones?.darDeBajaOk ?? true),
  };
  const repositorioComercios: jest.Mocked<IRepositorioComercios> = {
    crear: jest.fn(),
    obtenerPropio: jest.fn().mockResolvedValue(opciones?.comercio === undefined ? { id: comercioId, estadoVerificacion: 'verificado' } : opciones.comercio),
    listarVerificados: jest.fn(),
  };
  return { repositorioProductos, repositorioComercios };
}

describe('DarDeBajaProductoComercio', () => {
  it('Paso 1: da de baja el producto propio', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes();
    const caso = new DarDeBajaProductoComercio(repositorioProductos, repositorioComercios);

    const resultado = await caso.ejecutar({ productoId, usuarioId });

    expect(resultado).toEqual({ id: productoId });
    expect(repositorioProductos.darDeBaja).toHaveBeenCalledWith(productoId, comercioId);
  });

  it('AC: rechaza con 403 / PEA-SIS-002 cuando el producto pertenece a otro comercio', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes({ actual: { id: productoId, comercioId: otroComercioId } });
    const caso = new DarDeBajaProductoComercio(repositorioProductos, repositorioComercios);

    await expect(caso.ejecutar({ productoId, usuarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioProductos.darDeBaja).not.toHaveBeenCalled();
  });

  it('responde 404 / PEA-COM-004 si el producto no existe', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes({ actual: null });
    const caso = new DarDeBajaProductoComercio(repositorioProductos, repositorioComercios);

    await expect(caso.ejecutar({ productoId, usuarioId })).rejects.toBeInstanceOf(ProductoComercioNoEncontradoError);
  });

  it('responde 404 / PEA-COM-004 si el soft delete condicionado no afecta ninguna fila (carrera entre autorizar y persistir)', async () => {
    const { repositorioProductos, repositorioComercios } = crearFakes({ darDeBajaOk: false });
    const caso = new DarDeBajaProductoComercio(repositorioProductos, repositorioComercios);

    await expect(caso.ejecutar({ productoId, usuarioId })).rejects.toBeInstanceOf(ProductoComercioNoEncontradoError);
  });
});
