/**
 * @jest-environment node
 */
import { PublicarProductoComercio } from '@aplicacion/casos-de-uso/comercios/PublicarProductoComercio';
import type { IRepositorioProductosComercio, ProductoComercio } from '@dominio/puertos/IRepositorioProductosComercio';
import type { ComercioPropio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { ComercioNoVerificadoError, ComercioPropioNoEncontradoError } from '@dominio/errores/erroresComercios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const comercioId = '22222222-2222-2222-2222-222222222222';

const datosValidos = {
  nombre: 'Balanceado premium 15kg',
  descripcion: '<script>alert(1)</script>Producto de alta calidad',
  categoria: 'alimento',
  precio: 15000,
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: usuarioId, email: 'comercio@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: new Date() };
}

function crearComercioPropio(estadoVerificacion = 'verificado'): ComercioPropio {
  return { id: comercioId, estadoVerificacion };
}

function crearFakes(opciones?: { rol?: string; comercio?: ComercioPropio | null }) {
  const productoCreado: ProductoComercio = {
    id: 'producto-1',
    comercioId,
    nombre: datosValidos.nombre,
    descripcion: 'Producto de alta calidad',
    categoria: datosValidos.categoria,
    precio: datosValidos.precio,
    createdAt: new Date('2026-09-14T10:00:00.000Z'),
  };
  const repositorioProductos: jest.Mocked<IRepositorioProductosComercio> = {
    crear: jest.fn().mockResolvedValue(productoCreado),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
  };
  const repositorioComercios: jest.Mocked<IRepositorioComercios> = {
    crear: jest.fn(),
    obtenerPropio: jest.fn().mockResolvedValue(opciones?.comercio === undefined ? crearComercioPropio() : opciones.comercio),
    listarVerificados: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'comerciante')),
  };
  return { repositorioProductos, repositorioComercios, repositorioPerfil, productoCreado };
}

describe('PublicarProductoComercio', () => {
  it('Paso 1: publica el producto en el comercio propio del usuario autenticado', async () => {
    const { repositorioProductos, repositorioComercios, repositorioPerfil } = crearFakes();
    const caso = new PublicarProductoComercio(repositorioProductos, repositorioComercios, repositorioPerfil);

    const resultado = await caso.ejecutar({ datosCrudos: datosValidos, usuarioId });

    expect(resultado.comercioId).toBe(comercioId);
    expect(repositorioProductos.crear).toHaveBeenCalledWith(comercioId, {
      nombre: datosValidos.nombre,
      descripcion: 'Producto de alta calidad',
      categoria: datosValidos.categoria,
      precio: datosValidos.precio,
    });
  });

  it('Paso 3: sanitiza la descripción con DOMPurify antes de persistir, despojando cualquier etiqueta HTML', async () => {
    const { repositorioProductos, repositorioComercios, repositorioPerfil } = crearFakes();
    const caso = new PublicarProductoComercio(repositorioProductos, repositorioComercios, repositorioPerfil);

    await caso.ejecutar({ datosCrudos: datosValidos, usuarioId });

    const [, datosEnviados] = repositorioProductos.crear.mock.calls[0]!;
    expect(datosEnviados.descripcion).not.toContain('<script>');
    expect(datosEnviados.descripcion).toBe('Producto de alta calidad');
  });

  it.each(['dueño', 'veterinario', 'rescatista', 'organizacion', 'municipio', 'administrador'])(
    'rechaza con 403 / PEA-SIS-002 a un usuario con rol %s',
    async (rol) => {
      const { repositorioProductos, repositorioComercios, repositorioPerfil } = crearFakes({ rol });
      const caso = new PublicarProductoComercio(repositorioProductos, repositorioComercios, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: datosValidos, usuarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
      expect(repositorioProductos.crear).not.toHaveBeenCalled();
    },
  );

  it('responde 404 / PEA-COM-003 si el comerciante no tiene ningún comercio registrado', async () => {
    const { repositorioProductos, repositorioComercios, repositorioPerfil } = crearFakes({ comercio: null });
    const caso = new PublicarProductoComercio(repositorioProductos, repositorioComercios, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, usuarioId })).rejects.toBeInstanceOf(ComercioPropioNoEncontradoError);
    expect(repositorioProductos.crear).not.toHaveBeenCalled();
  });

  it('AC: rechaza con 403 / PEA-COM-001 cuando el comercio todavía no está verificado', async () => {
    const { repositorioProductos, repositorioComercios, repositorioPerfil } = crearFakes({ comercio: crearComercioPropio('pendiente') });
    const caso = new PublicarProductoComercio(repositorioProductos, repositorioComercios, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: datosValidos, usuarioId })).rejects.toBeInstanceOf(ComercioNoVerificadoError);
    expect(repositorioProductos.crear).not.toHaveBeenCalled();
  });
});
