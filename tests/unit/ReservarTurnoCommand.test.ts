/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ReservarTurnoCommand } from '@aplicacion/casos-de-uso/turnos/ReservarTurnoCommand';
import type { IRepositorioTurnos, TurnoActual, TurnoReservado } from '@dominio/puertos/IRepositorioTurnos';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { EventoOTurnoNoEncontradoError, TurnoYaReservadoError } from '@dominio/errores/erroresMunicipio';

const turnoId = '11111111-1111-4111-8111-111111111111';
const reservadoPor = '22222222-2222-4222-8222-222222222222';

const turnoDisponible: TurnoActual = {
  id: turnoId,
  estado: 'disponible',
  version: 3,
  reservadoPor: null,
  proveedorId: 'municipio-1',
};

function crearFakes(opciones?: { turnoActual?: TurnoActual | null; reservarDevuelve?: TurnoReservado | null }) {
  const repositorioTurnos: jest.Mocked<IRepositorioTurnos> = {
    contarDisponiblesPorEvento: jest.fn(),
    crearLote: jest.fn(),
    listarPropios: jest.fn(),
    cancelar: jest.fn(),
    listarFranjasExistentes: jest.fn(),
    reprogramar: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(opciones?.turnoActual === undefined ? turnoDisponible : opciones.turnoActual),
    reservar: jest
      .fn()
      .mockResolvedValue(
        opciones?.reservarDevuelve === undefined
          ? { id: turnoId, estado: 'reservado', reservadoPor, version: 4 }
          : opciones.reservarDevuelve,
      ),
  };
  const repositorioNotificaciones: jest.Mocked<INotificacionesRepositorio> = {
    crear: jest.fn().mockResolvedValue(undefined),
    listarPorUsuario: jest.fn(),
    marcarComoLeida: jest.fn(),
  };
  return { repositorioTurnos, repositorioNotificaciones };
}

describe('ReservarTurnoCommand', () => {
  it('AC: reserva un turno disponible — actualiza estado/version/reservado_por e inserta la notificación turno_confirmado (Observer)', async () => {
    const fakes = crearFakes();
    const caso = new ReservarTurnoCommand(fakes.repositorioTurnos, fakes.repositorioNotificaciones);

    const resultado = await caso.ejecutar({ datosCrudos: { turnoId }, reservadoPor });

    expect(resultado).toEqual({ id: turnoId, estado: 'reservado', reservadoPor, version: 4 });
    expect(fakes.repositorioTurnos.obtenerActual).toHaveBeenCalledWith(turnoId);
    expect(fakes.repositorioTurnos.reservar).toHaveBeenCalledWith(turnoId, reservadoPor, 3);
    expect(fakes.repositorioNotificaciones.crear).toHaveBeenCalledWith({
      usuarioId: reservadoPor,
      tipo: 'turno_confirmado',
      referenciaTabla: 'turnos',
      referenciaId: turnoId,
    });
  });

  it('rechaza fail-fast (Zod) un turnoId mal formado, sin tocar el repositorio', async () => {
    const fakes = crearFakes();
    const caso = new ReservarTurnoCommand(fakes.repositorioTurnos, fakes.repositorioNotificaciones);

    await expect(caso.ejecutar({ datosCrudos: { turnoId: 'no-es-un-uuid' }, reservadoPor })).rejects.toBeInstanceOf(ZodError);
    expect(fakes.repositorioTurnos.obtenerActual).not.toHaveBeenCalled();
  });

  it('AC (PEA-MUN-003): rechaza con 404 si el turno no existe o está soft-deleted', async () => {
    const fakes = crearFakes({ turnoActual: null });
    const caso = new ReservarTurnoCommand(fakes.repositorioTurnos, fakes.repositorioNotificaciones);

    await expect(caso.ejecutar({ datosCrudos: { turnoId }, reservadoPor })).rejects.toBeInstanceOf(EventoOTurnoNoEncontradoError);
    expect(fakes.repositorioTurnos.reservar).not.toHaveBeenCalled();
  });

  it('AC (Paso 2, PEA-MUN-001): rechaza con 409 cuando el UPDATE condicionado afecta 0 filas (ya reservado/cancelado)', async () => {
    const fakes = crearFakes({ reservarDevuelve: null });
    const caso = new ReservarTurnoCommand(fakes.repositorioTurnos, fakes.repositorioNotificaciones);

    await expect(caso.ejecutar({ datosCrudos: { turnoId }, reservadoPor })).rejects.toBeInstanceOf(TurnoYaReservadoError);
    expect(fakes.repositorioNotificaciones.crear).not.toHaveBeenCalled();
  });

  it('propaga a IRepositorioTurnos.reservar exactamente la version leída por obtenerActual (control optimista)', async () => {
    const fakes = crearFakes({
      turnoActual: { id: turnoId, estado: 'disponible', version: 17, reservadoPor: null, proveedorId: 'municipio-1' },
    });
    const caso = new ReservarTurnoCommand(fakes.repositorioTurnos, fakes.repositorioNotificaciones);

    await caso.ejecutar({ datosCrudos: { turnoId }, reservadoPor });

    expect(fakes.repositorioTurnos.reservar).toHaveBeenCalledWith(turnoId, reservadoPor, 17);
  });

  it('no requiere ninguna verificación de rol (autorizar es no-op — cualquier autenticado reserva para sí)', async () => {
    const fakes = crearFakes();
    const caso = new ReservarTurnoCommand(fakes.repositorioTurnos, fakes.repositorioNotificaciones);

    await expect(caso.ejecutar({ datosCrudos: { turnoId }, reservadoPor })).resolves.toBeDefined();
  });

  it('no falla la reserva si la notificación posterior falla (Observer desacoplado)', async () => {
    const fakes = crearFakes();
    fakes.repositorioNotificaciones.crear.mockRejectedValue(new Error('la tabla notificaciones no responde'));
    const caso = new ReservarTurnoCommand(fakes.repositorioTurnos, fakes.repositorioNotificaciones);

    await expect(caso.ejecutar({ datosCrudos: { turnoId }, reservadoPor })).resolves.toMatchObject({ estado: 'reservado' });
  });
});
