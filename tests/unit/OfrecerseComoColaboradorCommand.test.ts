/**
 * @jest-environment node
 */
import { OfrecerseComoColaboradorCommand } from '@aplicacion/casos-de-uso/red-colaboracion/OfrecerseComoColaboradorCommand';
import type { ColaboracionPropuesta, IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';
import type { IRepositorioSolicitudesRecurso, SolicitudActual } from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import {
  ColaboracionYaPropuestaError,
  SolicitudNoEncontradaError,
  SolicitudYaCubiertaError,
} from '@dominio/errores/erroresRedColaboracion';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

jest.mock('@infraestructura/logging/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

const solicitudId = '11111111-1111-1111-1111-111111111111';
const organizacionId = '22222222-2222-2222-2222-222222222222';
const stakeholderId = '33333333-3333-3333-3333-333333333333';

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: stakeholderId, email: 'rescatista@ejemplo.test', rol, estadoVerificacion: 'no_requerido', verificadoEn: null };
}

function crearFakes(opciones?: {
  rol?: string;
  solicitud?: SolicitudActual | null;
  yaPropuso?: boolean;
}) {
  const solicitud: SolicitudActual | null =
    opciones && 'solicitud' in opciones ? opciones.solicitud! : { estado: 'abierta', organizacionId };

  const repositorioColaboraciones: jest.Mocked<IRepositorioColaboraciones> = {
    obtenerActual: jest.fn(),
    actualizarEstado: jest.fn(),
    listarHistorialEstado: jest.fn(),
    existePropuestaDe: jest.fn().mockResolvedValue(opciones?.yaPropuso ?? false),
    crear: jest.fn().mockImplementation(async () => ({
      id: 'colaboracion-1',
      solicitudId,
      stakeholderId,
      organizacionId,
      estado: 'propuesta',
      createdAt: new Date('2026-09-14T10:00:00.000Z'),
    })) as jest.MockedFunction<IRepositorioColaboraciones['crear']>,
    obtenerMetricasPropias: jest.fn(),
  };
  const repositorioSolicitudes: jest.Mocked<IRepositorioSolicitudesRecurso> = {
    crear: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(solicitud),
    listarAsistenciaVeterinariaAbiertas: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'rescatista')),
  };
  const repositorioNotificaciones: jest.Mocked<INotificacionesRepositorio> = {
    crear: jest.fn().mockResolvedValue(undefined),
    existePorReferencia: jest.fn(),
    listarPorUsuario: jest.fn(),
    marcarComoLeida: jest.fn(),
  };
  return { repositorioColaboraciones, repositorioSolicitudes, repositorioPerfil, repositorioNotificaciones };
}

describe('OfrecerseComoColaboradorCommand', () => {
  it('crea la colaboración con estado "propuesta" y notifica a la organización dueña', async () => {
    const fakes = crearFakes();
    const comando = new OfrecerseComoColaboradorCommand(
      fakes.repositorioColaboraciones,
      fakes.repositorioSolicitudes,
      fakes.repositorioPerfil,
      fakes.repositorioNotificaciones,
    );

    const resultado: ColaboracionPropuesta = await comando.ejecutar({ solicitudId, stakeholderId });

    expect(resultado).toMatchObject({ solicitudId, stakeholderId, organizacionId, estado: 'propuesta' });
    expect(fakes.repositorioColaboraciones.crear).toHaveBeenCalledWith({ solicitudId, stakeholderId });
    expect(fakes.repositorioNotificaciones.crear).toHaveBeenCalledWith({
      usuarioId: organizacionId,
      tipo: 'colaboracion_propuesta',
      referenciaTabla: 'colaboraciones',
      referenciaId: 'colaboracion-1',
    });
  });

  it.each(['veterinario'])('también permite ofrecerse a un usuario con rol %s', async (rol) => {
    const fakes = crearFakes({ rol });
    const comando = new OfrecerseComoColaboradorCommand(
      fakes.repositorioColaboraciones,
      fakes.repositorioSolicitudes,
      fakes.repositorioPerfil,
      fakes.repositorioNotificaciones,
    );

    await expect(comando.ejecutar({ solicitudId, stakeholderId })).resolves.toBeDefined();
  });

  it.each(['dueño', 'organizacion', 'municipio', 'administrador', 'comerciante'])(
    'rechaza con 403 / PEA-SIS-002 a un usuario con rol %s',
    async (rol) => {
      const fakes = crearFakes({ rol });
      const comando = new OfrecerseComoColaboradorCommand(
        fakes.repositorioColaboraciones,
        fakes.repositorioSolicitudes,
        fakes.repositorioPerfil,
        fakes.repositorioNotificaciones,
      );

      await expect(comando.ejecutar({ solicitudId, stakeholderId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
      expect(fakes.repositorioColaboraciones.crear).not.toHaveBeenCalled();
    },
  );

  it('rechaza con 404 / PEA-RED-003 si la solicitud no existe o está soft-deleted', async () => {
    const fakes = crearFakes({ solicitud: null });
    const comando = new OfrecerseComoColaboradorCommand(
      fakes.repositorioColaboraciones,
      fakes.repositorioSolicitudes,
      fakes.repositorioPerfil,
      fakes.repositorioNotificaciones,
    );

    await expect(comando.ejecutar({ solicitudId, stakeholderId })).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
    expect(fakes.repositorioColaboraciones.crear).not.toHaveBeenCalled();
  });

  it.each(['cubierta', 'cancelada'])('rechaza con 409 / PEA-RED-001 si la solicitud ya no está abierta (%s)', async (estado) => {
    const fakes = crearFakes({ solicitud: { estado, organizacionId } });
    const comando = new OfrecerseComoColaboradorCommand(
      fakes.repositorioColaboraciones,
      fakes.repositorioSolicitudes,
      fakes.repositorioPerfil,
      fakes.repositorioNotificaciones,
    );

    await expect(comando.ejecutar({ solicitudId, stakeholderId })).rejects.toBeInstanceOf(SolicitudYaCubiertaError);
    expect(fakes.repositorioColaboraciones.crear).not.toHaveBeenCalled();
  });

  it('rechaza con 409 / PEA-RED-002 si el mismo stakeholder ya se había ofrecido antes sobre esta solicitud', async () => {
    const fakes = crearFakes({ yaPropuso: true });
    const comando = new OfrecerseComoColaboradorCommand(
      fakes.repositorioColaboraciones,
      fakes.repositorioSolicitudes,
      fakes.repositorioPerfil,
      fakes.repositorioNotificaciones,
    );

    await expect(comando.ejecutar({ solicitudId, stakeholderId })).rejects.toBeInstanceOf(ColaboracionYaPropuestaError);
    expect(fakes.repositorioColaboraciones.crear).not.toHaveBeenCalled();
  });

  it('no hace fallar el ofrecimiento ya confirmado si la notificación falla', async () => {
    const fakes = crearFakes();
    fakes.repositorioNotificaciones.crear.mockRejectedValue(new Error('Supabase caído'));
    const comando = new OfrecerseComoColaboradorCommand(
      fakes.repositorioColaboraciones,
      fakes.repositorioSolicitudes,
      fakes.repositorioPerfil,
      fakes.repositorioNotificaciones,
    );

    await expect(comando.ejecutar({ solicitudId, stakeholderId })).resolves.toMatchObject({ estado: 'propuesta' });
    expect(logger.error).toHaveBeenCalled();
  });
});
