/**
 * @jest-environment node
 */
import { RecordatorioTurnoJob } from '@infraestructura/jobs/RecordatorioTurnoJob';
import type { IRepositorioTurnos, TurnoRecordatorio } from '@dominio/puertos/IRepositorioTurnos';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { logger } from '@infraestructura/logging/logger';

jest.mock('@infraestructura/logging/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

const AHORA = new Date('2026-09-14T10:00:00.000Z');

function crearFakes(opciones?: { turnos?: TurnoRecordatorio[]; yaNotificado?: boolean }) {
  const repositorioTurnos: jest.Mocked<IRepositorioTurnos> = {
    contarDisponiblesPorEvento: jest.fn(),
    crearLote: jest.fn(),
    obtenerActual: jest.fn(),
    reservar: jest.fn(),
    listarPropios: jest.fn(),
    cancelar: jest.fn(),
    reprogramar: jest.fn(),
    listarFranjasExistentes: jest.fn(),
    listarReservadosPorProveedor: jest.fn(),
    listarReservadosEnVentana: jest.fn().mockResolvedValue(
      opciones?.turnos ?? [{ id: 'turno-1', reservadoPor: 'dueno-1', franjaInicio: new Date('2026-09-14T20:00:00.000Z') }],
    ),
    actualizarAsistio: jest.fn(),
    calcularTasaNoShow: jest.fn(),
  };
  const repositorioNotificaciones: jest.Mocked<INotificacionesRepositorio> = {
    crear: jest.fn().mockResolvedValue(undefined),
    existePorReferencia: jest.fn().mockResolvedValue(opciones?.yaNotificado ?? false),
    listarPorUsuario: jest.fn(),
    marcarComoLeida: jest.fn(),
  };
  return { repositorioTurnos, repositorioNotificaciones };
}

describe('RecordatorioTurnoJob', () => {
  it('AC (Paso 1): consulta la ventana de 24hs desde "ahora" y notifica a reservado_por de cada turno', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes();
    const job = new RecordatorioTurnoJob(repositorioTurnos, repositorioNotificaciones);

    const resultado = await job.ejecutar(AHORA);

    expect(repositorioTurnos.listarReservadosEnVentana).toHaveBeenCalledWith(AHORA, new Date('2026-09-15T10:00:00.000Z'));
    expect(repositorioNotificaciones.crear).toHaveBeenCalledWith({
      usuarioId: 'dueno-1',
      tipo: 'turno_recordatorio',
      referenciaTabla: 'turnos',
      referenciaId: 'turno-1',
    });
    expect(resultado).toEqual({ turnosEnVentana: 1, notificados: 1 });
  });

  it('notifica a cada reservado_por distinto cuando hay varios turnos en la ventana', async () => {
    const turnos: TurnoRecordatorio[] = [
      { id: 'turno-1', reservadoPor: 'dueno-1', franjaInicio: new Date('2026-09-14T15:00:00.000Z') },
      { id: 'turno-2', reservadoPor: 'dueno-2', franjaInicio: new Date('2026-09-14T18:00:00.000Z') },
    ];
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes({ turnos });
    const job = new RecordatorioTurnoJob(repositorioTurnos, repositorioNotificaciones);

    const resultado = await job.ejecutar(AHORA);

    expect(repositorioNotificaciones.crear).toHaveBeenCalledTimes(2);
    expect(resultado).toEqual({ turnosEnVentana: 2, notificados: 2 });
  });

  it('no duplica el recordatorio si ya se notificó ese turno en una corrida anterior (idempotencia)', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes({ yaNotificado: true });
    const job = new RecordatorioTurnoJob(repositorioTurnos, repositorioNotificaciones);

    const resultado = await job.ejecutar(AHORA);

    expect(repositorioNotificaciones.crear).not.toHaveBeenCalled();
    expect(resultado).toEqual({ turnosEnVentana: 1, notificados: 0 });
  });

  it('no aborta la corrida si falla la notificación de un turno puntual — sigue con el resto y loguea el error', async () => {
    const turnos: TurnoRecordatorio[] = [
      { id: 'turno-1', reservadoPor: 'dueno-1', franjaInicio: new Date('2026-09-14T15:00:00.000Z') },
      { id: 'turno-2', reservadoPor: 'dueno-2', franjaInicio: new Date('2026-09-14T18:00:00.000Z') },
    ];
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes({ turnos });
    repositorioNotificaciones.crear.mockRejectedValueOnce(new Error('Supabase caído')).mockResolvedValueOnce(undefined);
    const job = new RecordatorioTurnoJob(repositorioTurnos, repositorioNotificaciones);

    const resultado = await job.ejecutar(AHORA);

    expect(resultado).toEqual({ turnosEnVentana: 2, notificados: 1 });
    expect(logger.error).toHaveBeenCalled();
  });

  it('sin turnos en la ventana, no llama a crear() y devuelve el resultado en cero', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes({ turnos: [] });
    const job = new RecordatorioTurnoJob(repositorioTurnos, repositorioNotificaciones);

    const resultado = await job.ejecutar(AHORA);

    expect(repositorioNotificaciones.crear).not.toHaveBeenCalled();
    expect(resultado).toEqual({ turnosEnVentana: 0, notificados: 0 });
  });
});
