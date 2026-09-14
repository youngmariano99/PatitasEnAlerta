/**
 * @jest-environment node
 *
 * Mismo motivo que RegistrarUsuario.test.ts: Prisma.PrismaClientKnownRequestError
 * deja de ser un constructor utilizable bajo jsdom.
 */
import { Prisma } from '@prisma/client';
import { RegistrarRescatista } from '@aplicacion/casos-de-uso/auth/RegistrarRescatista';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { Usuario, ROL_RESCATISTA_ID } from '@dominio/entidades/Usuario';
import { EmailYaRegistradoError } from '@dominio/errores/erroresAutenticacion';

function crearErrorConflictoUnico(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on email', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
}

describe('RegistrarRescatista (reutiliza el Template Method de RegistrarUsuario)', () => {
  const datos = { email: 'rescatista@ejemplo.test', password: 'contraseñaSegura123' };

  it('registra un rescatista nuevo con rol_id=5, sin exigir matrícula ni ningún dato de verificación profesional', async () => {
    const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
      existePorEmailActivo: jest.fn().mockResolvedValue(false),
      crear: jest.fn().mockImplementation(async (usuario: Usuario) => usuario),
    };
    const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
      registrarCredenciales: jest.fn().mockResolvedValue({ id: 'id-supabase-rescatista-1', email: datos.email }),
      eliminarCredenciales: jest.fn().mockResolvedValue(undefined),
      solicitarRecuperacionPassword: jest.fn().mockResolvedValue(undefined),
    };

    const caso = new RegistrarRescatista(repositorioUsuarios, proveedorAutenticacion);
    const resultado = await caso.ejecutar(datos as never);

    expect(resultado).toEqual({ id: 'id-supabase-rescatista-1', email: datos.email, rolId: ROL_RESCATISTA_ID });
    expect(proveedorAutenticacion.eliminarCredenciales).not.toHaveBeenCalled();
  });

  it('rechaza sin password (400, fail-fast vía Zod) antes de tocar Supabase Auth', async () => {
    const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
      existePorEmailActivo: jest.fn(),
      crear: jest.fn(),
    };
    const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
      registrarCredenciales: jest.fn(),
      eliminarCredenciales: jest.fn(),
      solicitarRecuperacionPassword: jest.fn(),
    };

    const caso = new RegistrarRescatista(repositorioUsuarios, proveedorAutenticacion);

    await expect(caso.ejecutar({ email: datos.email } as never)).rejects.toBeInstanceOf(Error);
    expect(proveedorAutenticacion.registrarCredenciales).not.toHaveBeenCalled();
  });

  it('rechaza el alta si el email ya está registrado, sin llamar al proveedor de autenticación', async () => {
    const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
      existePorEmailActivo: jest.fn().mockResolvedValue(true),
      crear: jest.fn(),
    };
    const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
      registrarCredenciales: jest.fn(),
      eliminarCredenciales: jest.fn(),
      solicitarRecuperacionPassword: jest.fn().mockResolvedValue(undefined),
    };

    const caso = new RegistrarRescatista(repositorioUsuarios, proveedorAutenticacion);

    await expect(caso.ejecutar(datos as never)).rejects.toBeInstanceOf(EmailYaRegistradoError);
    expect(proveedorAutenticacion.registrarCredenciales).not.toHaveBeenCalled();
  });

  it('revierte el alta en Supabase Auth y relanza EmailYaRegistradoError ante un conflicto de unicidad en BD (carrera)', async () => {
    const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
      existePorEmailActivo: jest.fn().mockResolvedValue(false),
      crear: jest.fn().mockRejectedValue(crearErrorConflictoUnico()),
    };
    const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
      registrarCredenciales: jest.fn().mockResolvedValue({ id: 'id-supabase-rescatista-2', email: datos.email }),
      eliminarCredenciales: jest.fn().mockResolvedValue(undefined),
      solicitarRecuperacionPassword: jest.fn().mockResolvedValue(undefined),
    };

    const caso = new RegistrarRescatista(repositorioUsuarios, proveedorAutenticacion);

    await expect(caso.ejecutar(datos as never)).rejects.toBeInstanceOf(EmailYaRegistradoError);
    expect(proveedorAutenticacion.eliminarCredenciales).toHaveBeenCalledWith('id-supabase-rescatista-2');
  });
});
