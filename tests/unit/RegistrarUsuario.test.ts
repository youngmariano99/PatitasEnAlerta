/**
 * @jest-environment node
 *
 * Prisma Client detecta un entorno "browser" bajo jsdom (define `window`) y
 * degrada su export `Prisma` — `Prisma.PrismaClientKnownRequestError` deja de
 * ser un constructor utilizable. Este caso de uso es puro backend: correrlo
 * bajo el entorno node evita ese falso positivo.
 */
import { Prisma } from '@prisma/client';
import { RegistrarUsuario } from '@aplicacion/casos-de-uso/auth/RegistrarUsuario';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { Usuario } from '@dominio/entidades/Usuario';
import { EmailYaRegistradoError } from '@dominio/errores/erroresAutenticacion';

function crearErrorConflictoUnico(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on email', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
}

describe('RegistrarUsuario (unidad, sin HTTP)', () => {
  const datos = { email: 'ana@ejemplo.test', password: 'contraseñaSegura123' };

  it('registra un dueño nuevo cuando el email no está en uso', async () => {
    const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
      existePorEmailActivo: jest.fn().mockResolvedValue(false),
      crear: jest.fn().mockImplementation(async (usuario: Usuario) => usuario),
    };
    const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
      registrarCredenciales: jest.fn().mockResolvedValue({ id: 'id-supabase-1', email: datos.email }),
      eliminarCredenciales: jest.fn().mockResolvedValue(undefined),
    };

    const caso = new RegistrarUsuario(repositorioUsuarios, proveedorAutenticacion);
    const resultado = await caso.ejecutar(datos as never);

    expect(resultado).toEqual({ id: 'id-supabase-1', email: datos.email, rolId: 1 });
    expect(proveedorAutenticacion.eliminarCredenciales).not.toHaveBeenCalled();
  });

  it('rechaza el alta si el email ya está registrado, sin llamar al proveedor de autenticación', async () => {
    const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
      existePorEmailActivo: jest.fn().mockResolvedValue(true),
      crear: jest.fn(),
    };
    const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
      registrarCredenciales: jest.fn(),
      eliminarCredenciales: jest.fn(),
    };

    const caso = new RegistrarUsuario(repositorioUsuarios, proveedorAutenticacion);

    await expect(caso.ejecutar(datos as never)).rejects.toBeInstanceOf(EmailYaRegistradoError);
    expect(proveedorAutenticacion.registrarCredenciales).not.toHaveBeenCalled();
  });

  it('revierte el alta en Supabase Auth y relanza EmailYaRegistradoError ante un conflicto de unicidad en BD (carrera)', async () => {
    const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
      existePorEmailActivo: jest.fn().mockResolvedValue(false),
      crear: jest.fn().mockRejectedValue(crearErrorConflictoUnico()),
    };
    const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
      registrarCredenciales: jest.fn().mockResolvedValue({ id: 'id-supabase-2', email: datos.email }),
      eliminarCredenciales: jest.fn().mockResolvedValue(undefined),
    };

    const caso = new RegistrarUsuario(repositorioUsuarios, proveedorAutenticacion);

    await expect(caso.ejecutar(datos as never)).rejects.toBeInstanceOf(EmailYaRegistradoError);
    expect(proveedorAutenticacion.eliminarCredenciales).toHaveBeenCalledWith('id-supabase-2');
  });

  it('revierte el alta en Supabase Auth y relanza el error original ante un fallo de persistencia no relacionado con duplicados', async () => {
    const errorInesperado = new Error('la base de datos no responde');
    const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
      existePorEmailActivo: jest.fn().mockResolvedValue(false),
      crear: jest.fn().mockRejectedValue(errorInesperado),
    };
    const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
      registrarCredenciales: jest.fn().mockResolvedValue({ id: 'id-supabase-3', email: datos.email }),
      eliminarCredenciales: jest.fn().mockResolvedValue(undefined),
    };

    const caso = new RegistrarUsuario(repositorioUsuarios, proveedorAutenticacion);

    await expect(caso.ejecutar(datos as never)).rejects.toBe(errorInesperado);
    expect(proveedorAutenticacion.eliminarCredenciales).toHaveBeenCalledWith('id-supabase-3');
  });

  it('no explota si la propia reversión en Supabase Auth falla — igual relanza el error original de persistencia', async () => {
    const errorInesperado = new Error('la base de datos no responde');
    const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
      existePorEmailActivo: jest.fn().mockResolvedValue(false),
      crear: jest.fn().mockRejectedValue(errorInesperado),
    };
    const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
      registrarCredenciales: jest.fn().mockResolvedValue({ id: 'id-supabase-4', email: datos.email }),
      eliminarCredenciales: jest.fn().mockRejectedValue(new Error('Supabase también está caído')),
    };

    const caso = new RegistrarUsuario(repositorioUsuarios, proveedorAutenticacion);

    await expect(caso.ejecutar(datos as never)).rejects.toBe(errorInesperado);
  });
});
