/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ResolverVerificacionCommand } from '@aplicacion/casos-de-uso/auth/ResolverVerificacionCommand';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { IRepositorioVerificaciones } from '@dominio/puertos/IRepositorioVerificaciones';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';

const idVerificacion = '11111111-1111-4111-8111-111111111111';

function perfil(rol: string): ResumenPerfilPropio {
  return { id: 'admin-1', email: 'admin@ejemplo.test', rol, estadoVerificacion: 'no_requerido', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string }) {
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(perfil(opciones?.rol ?? 'administrador')),
  };
  const repositorioVerificaciones: jest.Mocked<IRepositorioVerificaciones> = {
    listarPendientes: jest.fn(),
    listarResueltas: jest.fn(),
    resolver: jest.fn().mockImplementation(async (datos) => ({
      verificacionId: datos.verificacionId,
      usuarioId: 'vet-1',
      tipo: 'veterinario',
      estado: datos.decision,
    })),
  };
  const repositorioNotificaciones: jest.Mocked<INotificacionesRepositorio> = {
    crear: jest.fn().mockResolvedValue(undefined),
    listarPorUsuario: jest.fn(),
    marcarComoLeida: jest.fn(),
  };
  return { repositorioPerfil, repositorioVerificaciones, repositorioNotificaciones };
}

describe('ResolverVerificacionCommand', () => {
  it('aprueba una verificación y publica la notificación VerificacionResuelta (Observer)', async () => {
    const fakes = crearFakes();
    const caso = new ResolverVerificacionCommand(
      fakes.repositorioPerfil,
      fakes.repositorioVerificaciones,
      fakes.repositorioNotificaciones,
    );

    const resultado = await caso.ejecutar({
      verificacionId: idVerificacion,
      decision: 'aprobado',
      administradorId: 'admin-1',
    });

    expect(resultado.estado).toBe('aprobado');
    expect(fakes.repositorioVerificaciones.resolver).toHaveBeenCalledWith({
      verificacionId: idVerificacion,
      administradorId: 'admin-1',
      decision: 'aprobado',
      motivoRechazo: null,
    });
    expect(fakes.repositorioNotificaciones.crear).toHaveBeenCalledWith({
      usuarioId: 'vet-1',
      tipo: 'verificacion_resuelta',
      referenciaTabla: 'verificaciones',
      referenciaId: idVerificacion,
    });
  });

  it('rechaza fail-fast (PEA-SIS-005) un rechazo sin motivo, sin llegar al repositorio', async () => {
    const fakes = crearFakes();
    const caso = new ResolverVerificacionCommand(
      fakes.repositorioPerfil,
      fakes.repositorioVerificaciones,
      fakes.repositorioNotificaciones,
    );

    await expect(
      caso.ejecutar({ verificacionId: idVerificacion, decision: 'rechazado', administradorId: 'admin-1' }),
    ).rejects.toBeInstanceOf(PayloadInvalidoError);
    expect(fakes.repositorioPerfil.obtenerPerfilPropio).not.toHaveBeenCalled();
    expect(fakes.repositorioVerificaciones.resolver).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) un id mal formado', async () => {
    const fakes = crearFakes();
    const caso = new ResolverVerificacionCommand(
      fakes.repositorioPerfil,
      fakes.repositorioVerificaciones,
      fakes.repositorioNotificaciones,
    );

    await expect(
      caso.ejecutar({ verificacionId: 'no-es-un-uuid', decision: 'aprobado', administradorId: 'admin-1' }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('con motivo, rechaza la verificación correctamente', async () => {
    const fakes = crearFakes();
    const caso = new ResolverVerificacionCommand(
      fakes.repositorioPerfil,
      fakes.repositorioVerificaciones,
      fakes.repositorioNotificaciones,
    );

    await caso.ejecutar({
      verificacionId: idVerificacion,
      decision: 'rechazado',
      motivoRechazo: 'Matrícula no encontrada en el padrón',
      administradorId: 'admin-1',
    });

    expect(fakes.repositorioVerificaciones.resolver).toHaveBeenCalledWith({
      verificacionId: idVerificacion,
      administradorId: 'admin-1',
      decision: 'rechazado',
      motivoRechazo: 'Matrícula no encontrada en el padrón',
    });
  });

  it('rechaza con 403 (PEA-SIS-002) si quien invoca no es administrador, sin tocar el repositorio', async () => {
    const fakes = crearFakes({ rol: 'veterinario' });
    const caso = new ResolverVerificacionCommand(
      fakes.repositorioPerfil,
      fakes.repositorioVerificaciones,
      fakes.repositorioNotificaciones,
    );

    await expect(
      caso.ejecutar({ verificacionId: idVerificacion, decision: 'aprobado', administradorId: 'admin-1' }),
    ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(fakes.repositorioVerificaciones.resolver).not.toHaveBeenCalled();
  });

  it('no falla la resolución si la notificación posterior falla (Observer desacoplado)', async () => {
    const fakes = crearFakes();
    fakes.repositorioNotificaciones.crear.mockRejectedValue(new Error('la tabla notificaciones no responde'));
    const caso = new ResolverVerificacionCommand(
      fakes.repositorioPerfil,
      fakes.repositorioVerificaciones,
      fakes.repositorioNotificaciones,
    );

    await expect(
      caso.ejecutar({ verificacionId: idVerificacion, decision: 'aprobado', administradorId: 'admin-1' }),
    ).resolves.toMatchObject({ estado: 'aprobado' });
  });
});
