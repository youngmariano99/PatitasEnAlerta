/**
 * @jest-environment node
 */
import { CrearProductoVeterinario } from '@aplicacion/casos-de-uso/veterinarios-avanzado/CrearProductoVeterinario';
import type { IRepositorioProductosVeterinario, ProductoVeterinario } from '@dominio/puertos/IRepositorioProductosVeterinario';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const veterinarioId = '11111111-1111-1111-1111-111111111111';

const datosValidos = { nombre: 'Antipulgas x3', descripcion: 'Pipeta mensual', precio: 4500, stock: 20 };

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: veterinarioId, email: 'vet@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: new Date() };
}

function crearFakes(opciones?: { rol?: string }) {
  const productoCreado: ProductoVeterinario = {
    id: 'producto-1',
    veterinarioId,
    nombre: datosValidos.nombre,
    descripcion: datosValidos.descripcion,
    precio: datosValidos.precio,
    stock: datosValidos.stock,
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
  };
  const repositorioProductos: jest.Mocked<IRepositorioProductosVeterinario> = {
    crear: jest.fn().mockResolvedValue(productoCreado),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
    listarPropios: jest.fn(),
    listarActivos: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'veterinario')),
  };
  return { repositorioProductos, repositorioPerfil, productoCreado };
}

describe('CrearProductoVeterinario', () => {
  it('Paso 1: crea el producto con veterinarioId de la sesión, nunca del body', async () => {
    const { repositorioProductos, repositorioPerfil, productoCreado } = crearFakes();
    const caso = new CrearProductoVeterinario(repositorioProductos, repositorioPerfil);

    const resultado = await caso.ejecutar({ datosCrudos: datosValidos, veterinarioId });

    expect(resultado).toEqual(productoCreado);
    expect(repositorioProductos.crear).toHaveBeenCalledWith(veterinarioId, datosValidos);
  });

  it.each(['dueño', 'rescatista', 'organizacion', 'municipio', 'administrador', 'comerciante'])(
    'rechaza con 403 / PEA-SIS-002 a un usuario con rol %s',
    async (rol) => {
      const { repositorioProductos, repositorioPerfil } = crearFakes({ rol });
      const caso = new CrearProductoVeterinario(repositorioProductos, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: datosValidos, veterinarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
      expect(repositorioProductos.crear).not.toHaveBeenCalled();
    },
  );

  it('rechaza precio negativo (400, fail-fast vía Zod)', async () => {
    const { repositorioProductos, repositorioPerfil } = crearFakes();
    const caso = new CrearProductoVeterinario(repositorioProductos, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: { ...datosValidos, precio: -1 }, veterinarioId })).rejects.toThrow();
    expect(repositorioProductos.crear).not.toHaveBeenCalled();
  });

  it('rechaza stock negativo (400, fail-fast vía Zod)', async () => {
    const { repositorioProductos, repositorioPerfil } = crearFakes();
    const caso = new CrearProductoVeterinario(repositorioProductos, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: { ...datosValidos, stock: -1 }, veterinarioId })).rejects.toThrow();
  });
});
