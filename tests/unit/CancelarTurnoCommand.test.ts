/**
 * @jest-environment node
 */
import { CancelarTurnoCommand } from '@aplicacion/casos-de-uso/turnos/CancelarTurnoCommand';
import type { IRepositorioTurnos, TurnoActual, TurnoCancelado } from '@dominio/puertos/IRepositorioTurnos';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { EventoOTurnoNoEncontradoError } from '@dominio/errores/erroresMunicipio';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const turnoId = '11111111-1111-4111-8111-111111111111';
const reservante = '22222222-2222-4222-8222-222222222222';
const proveedor = '33333333-3333-4333-8333-333333333333';
const otroUsuario = '44444444-4444-4444-8444-444444444444';

const turnoReservado: TurnoActual = {
  id: turnoId,
  estado: 'reservado',
  version: 5,
  reservadoPor: reservante,
  proveedorId: proveedor,
};

function crearFakes(opciones?: { turnoActual?: TurnoActual | null; cancelarDevuelve?: TurnoCancelado | null }) {
  const repositorioTurnos: jest.Mocked<IRepositorioTurnos> = {
    contarDisponiblesPorEvento: jest.fn(),
    crearLote: jest.fn(),
    listarPropios: jest.fn(),
    reservar: jest.fn(),
    reprogramar: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(opciones?.turnoActual === undefined ? turnoReservado : opciones.turnoActual),
    cancelar: jest
      .fn()
      .mockResolvedValue(
        opciones?.cancelarDevuelve === undefined
          ? { id: turnoId, estado: 'cancelado', reservadoPor: reservante, proveedorId: proveedor, version: 6 }
          : opciones.cancelarDevuelve,
      ),
  };
  const repositorioNotificaciones: jest.Mocked<INotificacionesRepositorio> = {
    crear: jest.fn().mockResolvedValue(undefined),
    listarPorUsuario: jest.fn(),
    marcarComoLeida: jest.fn(),
  };
  return { repositorioTurnos, repositorioNotificaciones };
}

describe('CancelarTurnoCommand', () => {
  it('AC: el reservante cancela su propio turno — pasa a estado cancelado, version incrementada, reservadoPor preservado', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes();
    const caso = new CancelarTurnoCommand(repositorioTurnos, repositorioNotificaciones);

    const resultado = await caso.ejecutar({ datosCrudos: { turnoId }, usuarioId: reservante });

    expect(resultado).toEqual({
      id: turnoId,
      estado: 'cancelado',
      reservadoPor: reservante,
      proveedorId: proveedor,
      version: 6,
      canceladoPor: reservante,
    });
    expect(repositorioTurnos.cancelar).toHaveBeenCalledWith(turnoId, 5);
  });

  it('AC (Paso 3): cuando cancela el reservante, notifica tipo=turno_cancelado al proveedor', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes();
    const caso = new CancelarTurnoCommand(repositorioTurnos, repositorioNotificaciones);

    await caso.ejecutar({ datosCrudos: { turnoId }, usuarioId: reservante });

    expect(repositorioNotificaciones.crear).toHaveBeenCalledWith({
      usuarioId: proveedor,
      tipo: 'turno_cancelado',
      referenciaTabla: 'turnos',
      referenciaId: turnoId,
    });
  });

  it('el proveedor puede cancelar el turno de un reservante — no se notifica a sí mismo', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes();
    const caso = new CancelarTurnoCommand(repositorioTurnos, repositorioNotificaciones);

    const resultado = await caso.ejecutar({ datosCrudos: { turnoId }, usuarioId: proveedor });

    expect(resultado.canceladoPor).toBe(proveedor);
    expect(repositorioNotificaciones.crear).not.toHaveBeenCalled();
  });

  it('AC (Paso 1, 403 / PEA-SIS-002): un usuario que no es el reservante ni el proveedor no puede cancelar', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes();
    const caso = new CancelarTurnoCommand(repositorioTurnos, repositorioNotificaciones);

    await expect(caso.ejecutar({ datosCrudos: { turnoId }, usuarioId: otroUsuario })).rejects.toBeInstanceOf(
      AccesoNoAutorizadoError,
    );
    expect(repositorioTurnos.cancelar).not.toHaveBeenCalled();
  });

  it('AC (404 / PEA-MUN-003): un turno inexistente se rechaza sin verificar pertenencia ni intentar cancelar', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes({ turnoActual: null });
    const caso = new CancelarTurnoCommand(repositorioTurnos, repositorioNotificaciones);

    await expect(caso.ejecutar({ datosCrudos: { turnoId }, usuarioId: reservante })).rejects.toBeInstanceOf(
      EventoOTurnoNoEncontradoError,
    );
    expect(repositorioTurnos.cancelar).not.toHaveBeenCalled();
  });

  it.each(['disponible', 'cancelado'])(
    'AC/Paso 4 (404 / PEA-MUN-003): un turno en estado %s (nunca reservado o ya cancelado) se rechaza igual que uno inexistente',
    async (estado) => {
      const { repositorioTurnos, repositorioNotificaciones } = crearFakes({
        turnoActual: { ...turnoReservado, estado },
      });
      const caso = new CancelarTurnoCommand(repositorioTurnos, repositorioNotificaciones);

      await expect(caso.ejecutar({ datosCrudos: { turnoId }, usuarioId: reservante })).rejects.toBeInstanceOf(
        EventoOTurnoNoEncontradoError,
      );
      expect(repositorioTurnos.cancelar).not.toHaveBeenCalled();
    },
  );

  it('404 / PEA-MUN-003 cuando el UPDATE condicionado afecta 0 filas (carrera perdida entre la lectura y la escritura)', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes({ cancelarDevuelve: null });
    const caso = new CancelarTurnoCommand(repositorioTurnos, repositorioNotificaciones);

    await expect(caso.ejecutar({ datosCrudos: { turnoId }, usuarioId: reservante })).rejects.toBeInstanceOf(
      EventoOTurnoNoEncontradoError,
    );
    expect(repositorioNotificaciones.crear).not.toHaveBeenCalled();
  });

  it('no falla la cancelación si la notificación posterior falla (Observer desacoplado)', async () => {
    const { repositorioTurnos, repositorioNotificaciones } = crearFakes();
    repositorioNotificaciones.crear.mockRejectedValue(new Error('la tabla notificaciones no responde'));
    const caso = new CancelarTurnoCommand(repositorioTurnos, repositorioNotificaciones);

    await expect(caso.ejecutar({ datosCrudos: { turnoId }, usuarioId: reservante })).resolves.toMatchObject({
      estado: 'cancelado',
    });
  });
});
