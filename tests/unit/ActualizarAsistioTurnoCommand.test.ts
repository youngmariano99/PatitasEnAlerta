/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ActualizarAsistioTurnoCommand } from '@aplicacion/casos-de-uso/turnos/ActualizarAsistioTurnoCommand';
import type { IRepositorioTurnos, TurnoActual } from '@dominio/puertos/IRepositorioTurnos';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { EventoOTurnoNoEncontradoError } from '@dominio/errores/erroresMunicipio';
import { TurnoAunNoConcluidoError } from '@dominio/errores/erroresVeterinariosAvanzados';

const turnoId = '11111111-1111-1111-1111-111111111111';
const proveedorId = '22222222-2222-2222-2222-222222222222';
const otroUsuarioId = '33333333-3333-3333-3333-333333333333';

function crearFakes(opciones?: { turnoActual?: TurnoActual | null; asistioActualizadoDevuelve?: boolean }) {
  const turnoActual: TurnoActual | null =
    opciones && 'turnoActual' in opciones ? opciones.turnoActual! : { id: turnoId, estado: 'reservado', version: 0, reservadoPor: otroUsuarioId, proveedorId };

  const repositorioTurnos: jest.Mocked<IRepositorioTurnos> = {
    contarDisponiblesPorEvento: jest.fn(),
    crearLote: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(turnoActual),
    reservar: jest.fn(),
    listarPropios: jest.fn(),
    cancelar: jest.fn(),
    reprogramar: jest.fn(),
    listarFranjasExistentes: jest.fn(),
    listarReservadosPorProveedor: jest.fn(),
    listarReservadosEnVentana: jest.fn(),
    actualizarAsistio: jest
      .fn()
      .mockResolvedValue((opciones?.asistioActualizadoDevuelve ?? true) ? { id: turnoId, asistio: true } : null),
    calcularTasaNoShow: jest.fn(),
  };
  return { repositorioTurnos };
}

describe('ActualizarAsistioTurnoCommand', () => {
  it('Paso 2: marca asistencia cuando quien invoca es el proveedor del turno', async () => {
    const { repositorioTurnos } = crearFakes();
    const comando = new ActualizarAsistioTurnoCommand(repositorioTurnos);

    const resultado = await comando.ejecutar({ datosCrudos: { turnoId, asistio: true }, proveedorId });

    expect(resultado).toEqual({ id: turnoId, asistio: true });
    expect(repositorioTurnos.actualizarAsistio).toHaveBeenCalledWith(turnoId, proveedorId, true);
  });

  it('rechaza con ZodError un payload sin "asistio"', async () => {
    const { repositorioTurnos } = crearFakes();
    const comando = new ActualizarAsistioTurnoCommand(repositorioTurnos);

    await expect(comando.ejecutar({ datosCrudos: { turnoId }, proveedorId })).rejects.toBeInstanceOf(ZodError);
    expect(repositorioTurnos.actualizarAsistio).not.toHaveBeenCalled();
  });

  it('rechaza con 404 / PEA-MUN-003 si el turno no existe o no está "reservado"', async () => {
    const { repositorioTurnos } = crearFakes({ turnoActual: null });
    const comando = new ActualizarAsistioTurnoCommand(repositorioTurnos);

    await expect(comando.ejecutar({ datosCrudos: { turnoId, asistio: true }, proveedorId })).rejects.toBeInstanceOf(
      EventoOTurnoNoEncontradoError,
    );
  });

  it('rechaza con 403 / PEA-SIS-002 si quien invoca no es el proveedor del turno (ni siquiera el reservante)', async () => {
    const { repositorioTurnos } = crearFakes({
      turnoActual: { id: turnoId, estado: 'reservado', version: 0, reservadoPor: proveedorId, proveedorId: otroUsuarioId },
    });
    const comando = new ActualizarAsistioTurnoCommand(repositorioTurnos);

    await expect(comando.ejecutar({ datosCrudos: { turnoId, asistio: true }, proveedorId })).rejects.toBeInstanceOf(
      AccesoNoAutorizadoError,
    );
    expect(repositorioTurnos.actualizarAsistio).not.toHaveBeenCalled();
  });

  it('rechaza con 409 / PEA-VETADV-005 si la franja del turno todavía no concluyó', async () => {
    const { repositorioTurnos } = crearFakes({ asistioActualizadoDevuelve: false });
    const comando = new ActualizarAsistioTurnoCommand(repositorioTurnos);

    await expect(comando.ejecutar({ datosCrudos: { turnoId, asistio: true }, proveedorId })).rejects.toBeInstanceOf(
      TurnoAunNoConcluidoError,
    );
  });
});
