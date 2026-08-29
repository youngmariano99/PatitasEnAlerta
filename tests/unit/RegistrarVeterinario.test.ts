/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { RegistrarVeterinario } from '@aplicacion/casos-de-uso/auth/RegistrarVeterinario';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IRepositorioVeterinarios } from '@dominio/puertos/IRepositorioVeterinarios';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { PerfilVeterinario } from '@dominio/entidades/PerfilVeterinario';
import { EmailYaRegistradoError, MatriculaYaRegistradaError } from '@dominio/errores/erroresAutenticacion';

function crearErrorConflictoUnico(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on matricula, colegioEmisor', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
}

function crearFakes(opciones?: { emailYaRegistrado?: boolean }) {
  const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
    existePorEmailActivo: jest.fn().mockResolvedValue(opciones?.emailYaRegistrado ?? false),
    crear: jest.fn(),
  };
  const repositorioVeterinarios: jest.Mocked<IRepositorioVeterinarios> = {
    crear: jest
      .fn()
      .mockImplementation(async (datos) =>
        PerfilVeterinario.reconstruir(datos.id, {
          email: datos.email,
          matricula: datos.matricula,
          colegioEmisor: datos.colegioEmisor,
          estadoVerificacion: 'pendiente',
        }),
      ),
  };
  const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
    registrarCredenciales: jest.fn().mockResolvedValue({ id: 'auth-vet-1', email: 'vet@ejemplo.test' }),
    eliminarCredenciales: jest.fn().mockResolvedValue(undefined),
    solicitarRecuperacionPassword: jest.fn(),
  };
  return { repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion };
}

const datosBase = {
  email: 'vet@ejemplo.test',
  password: 'contraseñaSegura123',
  matricula: 'MP-1001',
  colegioEmisor: 'Colegio de Veterinarios de la Provincia de Buenos Aires',
};

describe('RegistrarVeterinario', () => {
  it('registra un veterinario nuevo en estado_verificacion "pendiente"', async () => {
    const { repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion } = crearFakes();
    const caso = new RegistrarVeterinario(repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion);

    const resultado = await caso.ejecutar(datosBase as never);

    expect(resultado).toEqual({
      id: 'auth-vet-1',
      email: datosBase.email,
      matricula: datosBase.matricula,
      colegioEmisor: datosBase.colegioEmisor,
      estadoVerificacion: 'pendiente',
    });
    expect(repositorioVeterinarios.crear).toHaveBeenCalledWith({
      id: 'auth-vet-1',
      email: datosBase.email,
      matricula: datosBase.matricula,
      colegioEmisor: datosBase.colegioEmisor,
    });
  });

  it('rechaza fail-fast (Zod) sin matrícula ni colegio emisor', async () => {
    const { repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion } = crearFakes();
    const caso = new RegistrarVeterinario(repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion);

    await expect(
      caso.ejecutar({ email: datosBase.email, password: datosBase.password } as never),
    ).rejects.toBeInstanceOf(ZodError);
    expect(proveedorAutenticacion.registrarCredenciales).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-AUTH-001 si el email ya está registrado, sin llegar a Supabase Auth', async () => {
    const { repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion } = crearFakes({
      emailYaRegistrado: true,
    });
    const caso = new RegistrarVeterinario(repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion);

    await expect(caso.ejecutar(datosBase as never)).rejects.toBeInstanceOf(EmailYaRegistradoError);
    expect(proveedorAutenticacion.registrarCredenciales).not.toHaveBeenCalled();
  });

  it('revierte el alta en Supabase Auth y responde PEA-AUTH-006 ante un conflicto de matrícula+colegio', async () => {
    const { repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion } = crearFakes();
    (repositorioVeterinarios.crear as jest.Mock).mockRejectedValue(crearErrorConflictoUnico());
    const caso = new RegistrarVeterinario(repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion);

    await expect(caso.ejecutar(datosBase as never)).rejects.toBeInstanceOf(MatriculaYaRegistradaError);
    expect(proveedorAutenticacion.eliminarCredenciales).toHaveBeenCalledWith('auth-vet-1');
  });

  it('revierte el alta en Supabase Auth y relanza el error original ante un fallo no relacionado con duplicados', async () => {
    const errorInesperado = new Error('la base de datos no responde');
    const { repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion } = crearFakes();
    (repositorioVeterinarios.crear as jest.Mock).mockRejectedValue(errorInesperado);
    const caso = new RegistrarVeterinario(repositorioUsuarios, repositorioVeterinarios, proveedorAutenticacion);

    await expect(caso.ejecutar(datosBase as never)).rejects.toBe(errorInesperado);
    expect(proveedorAutenticacion.eliminarCredenciales).toHaveBeenCalledWith('auth-vet-1');
  });
});
