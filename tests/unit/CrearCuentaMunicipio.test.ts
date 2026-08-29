/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { CrearCuentaMunicipio } from '@aplicacion/casos-de-uso/auth/CrearCuentaMunicipio';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IRepositorioMunicipios } from '@dominio/puertos/IRepositorioMunicipios';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { PerfilMunicipio } from '@dominio/entidades/PerfilMunicipio';
import { EmailYaRegistradoError, AltaInstitucionalNoAutorizadaError } from '@dominio/errores/erroresAutenticacion';

function crearErrorConflictoUnico(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on email', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
}

function perfilSolicitante(rol: string): ResumenPerfilPropio {
  return { id: 'solicitante-1', email: 'quien-solicita@ejemplo.test', rol, estadoVerificacion: 'no_requerido', verificadoEn: null };
}

function crearFakes(opciones?: { rolSolicitante?: string; emailYaRegistrado?: boolean }) {
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(perfilSolicitante(opciones?.rolSolicitante ?? 'administrador')),
  };
  const repositorioUsuarios: jest.Mocked<IRepositorioUsuarios> = {
    existePorEmailActivo: jest.fn().mockResolvedValue(opciones?.emailYaRegistrado ?? false),
    crear: jest.fn(),
  };
  const repositorioMunicipios: jest.Mocked<IRepositorioMunicipios> = {
    crear: jest
      .fn()
      .mockImplementation(async (datos) =>
        PerfilMunicipio.reconstruir(datos.id, {
          email: datos.email,
          nombreInstitucional: datos.nombreInstitucional,
          estadoVerificacion: 'verificado',
        }),
      ),
  };
  const proveedorAutenticacion: jest.Mocked<IProveedorAutenticacion> = {
    registrarCredenciales: jest.fn().mockResolvedValue({ id: 'auth-municipio-1', email: 'municipio.pringles@ejemplo.test' }),
    eliminarCredenciales: jest.fn().mockResolvedValue(undefined),
    solicitarRecuperacionPassword: jest.fn(),
  };
  return { repositorioPerfil, repositorioUsuarios, repositorioMunicipios, proveedorAutenticacion };
}

const datosBase = {
  email: 'municipio.pringles@ejemplo.test',
  password: 'contraseñaSegura123',
  nombreInstitucional: 'Municipalidad de Coronel Pringles — Zoonosis',
};

describe('CrearCuentaMunicipio', () => {
  it('un administrador da de alta la cuenta institucional, ya verificada', async () => {
    const fakes = crearFakes();
    const caso = new CrearCuentaMunicipio(
      fakes.repositorioPerfil,
      fakes.repositorioUsuarios,
      fakes.repositorioMunicipios,
      fakes.proveedorAutenticacion,
    );

    const resultado = await caso.ejecutar({ ...datosBase, solicitanteId: 'solicitante-1' });

    expect(resultado).toEqual({
      id: 'auth-municipio-1',
      email: datosBase.email,
      nombreInstitucional: datosBase.nombreInstitucional,
      estadoVerificacion: 'verificado',
    });
    expect(fakes.repositorioMunicipios.crear).toHaveBeenCalledWith({
      id: 'auth-municipio-1',
      email: datosBase.email,
      nombreInstitucional: datosBase.nombreInstitucional,
    });
  });

  it.each(['dueño', 'veterinario', 'rescatista'])(
    'rechaza con 403 (PEA-AUTH-011) si quien solicita tiene rol %s, sin llegar a Supabase Auth',
    async (rolSolicitante) => {
      const fakes = crearFakes({ rolSolicitante });
      const caso = new CrearCuentaMunicipio(
        fakes.repositorioPerfil,
        fakes.repositorioUsuarios,
        fakes.repositorioMunicipios,
        fakes.proveedorAutenticacion,
      );

      await expect(caso.ejecutar({ ...datosBase, solicitanteId: 'solicitante-1' })).rejects.toBeInstanceOf(
        AltaInstitucionalNoAutorizadaError,
      );
      expect(fakes.proveedorAutenticacion.registrarCredenciales).not.toHaveBeenCalled();
    },
  );

  it('rechaza fail-fast (Zod) sin nombre institucional', async () => {
    const fakes = crearFakes();
    const caso = new CrearCuentaMunicipio(
      fakes.repositorioPerfil,
      fakes.repositorioUsuarios,
      fakes.repositorioMunicipios,
      fakes.proveedorAutenticacion,
    );

    await expect(
      caso.ejecutar({ email: datosBase.email, password: datosBase.password, solicitanteId: 'solicitante-1' } as never),
    ).rejects.toBeInstanceOf(ZodError);
    expect(fakes.repositorioPerfil.obtenerPerfilPropio).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-AUTH-001 si el email ya está registrado, sin llegar a Supabase Auth', async () => {
    const fakes = crearFakes({ emailYaRegistrado: true });
    const caso = new CrearCuentaMunicipio(
      fakes.repositorioPerfil,
      fakes.repositorioUsuarios,
      fakes.repositorioMunicipios,
      fakes.proveedorAutenticacion,
    );

    await expect(caso.ejecutar({ ...datosBase, solicitanteId: 'solicitante-1' })).rejects.toBeInstanceOf(
      EmailYaRegistradoError,
    );
    expect(fakes.proveedorAutenticacion.registrarCredenciales).not.toHaveBeenCalled();
  });

  it('revierte el alta en Supabase Auth y responde PEA-AUTH-001 ante una carrera de email duplicado', async () => {
    const fakes = crearFakes();
    (fakes.repositorioMunicipios.crear as jest.Mock).mockRejectedValue(crearErrorConflictoUnico());
    const caso = new CrearCuentaMunicipio(
      fakes.repositorioPerfil,
      fakes.repositorioUsuarios,
      fakes.repositorioMunicipios,
      fakes.proveedorAutenticacion,
    );

    await expect(caso.ejecutar({ ...datosBase, solicitanteId: 'solicitante-1' })).rejects.toBeInstanceOf(
      EmailYaRegistradoError,
    );
    expect(fakes.proveedorAutenticacion.eliminarCredenciales).toHaveBeenCalledWith('auth-municipio-1');
  });
});
