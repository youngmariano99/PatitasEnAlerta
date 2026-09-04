/**
 * @jest-environment node
 */
import { ReprogramarTurnoCommand } from '@aplicacion/casos-de-uso/turnos/ReprogramarTurnoCommand';
import type { IRepositorioTurnos, TurnoActual, TurnoReprogramado } from '@dominio/puertos/IRepositorioTurnos';
import { EventoOTurnoNoEncontradoError, TurnoYaReservadoError } from '@dominio/errores/erroresMunicipio';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const turnoActualId = '11111111-1111-4111-8111-111111111111';
const turnoNuevoId = '22222222-2222-4222-8222-222222222222';
const reservante = '33333333-3333-4333-8333-333333333333';
const proveedor = '44444444-4444-4444-8444-444444444444';

const actualReservado: TurnoActual = {
  id: turnoActualId,
  estado: 'reservado',
  version: 5,
  reservadoPor: reservante,
  proveedorId: proveedor,
};

const nuevoDisponible: TurnoActual = {
  id: turnoNuevoId,
  estado: 'disponible',
  version: 0,
  reservadoPor: null,
  proveedorId: proveedor,
};

function crearFakes(opciones?: {
  actual?: TurnoActual | null;
  nuevo?: TurnoActual | null;
  reprogramarDevuelve?: TurnoReprogramado | null;
}) {
  const resultadoPorDefecto: TurnoReprogramado = {
    turnoCancelado: { id: turnoActualId, estado: 'cancelado', reservadoPor: reservante, proveedorId: proveedor, version: 6 },
    turnoReservado: { id: turnoNuevoId, estado: 'reservado', reservadoPor: reservante, version: 1 },
  };

  const repositorioTurnos: jest.Mocked<IRepositorioTurnos> = {
    contarDisponiblesPorEvento: jest.fn(),
    crearLote: jest.fn(),
    listarPropios: jest.fn(),
    reservar: jest.fn(),
    listarFranjasExistentes: jest.fn(),
    cancelar: jest.fn(),
    obtenerActual: jest.fn().mockImplementation(async (id: string) => {
      if (id === turnoActualId) return opciones?.actual === undefined ? actualReservado : opciones.actual;
      if (id === turnoNuevoId) return opciones?.nuevo === undefined ? nuevoDisponible : opciones.nuevo;
      return null;
    }),
    reprogramar: jest
      .fn()
      .mockResolvedValue(opciones?.reprogramarDevuelve === undefined ? resultadoPorDefecto : opciones.reprogramarDevuelve),
  };
  return { repositorioTurnos };
}

describe('ReprogramarTurnoCommand', () => {
  it('AC (Paso 2): cancela el turno actual y reserva el nuevo dentro de la misma transacción (delegado a IRepositorioTurnos.reprogramar)', async () => {
    const { repositorioTurnos } = crearFakes();
    const caso = new ReprogramarTurnoCommand(repositorioTurnos);

    const resultado = await caso.ejecutar({ datosCrudos: { turnoActualId, turnoNuevoId }, usuarioId: reservante });

    expect(repositorioTurnos.reprogramar).toHaveBeenCalledWith(turnoActualId, turnoNuevoId, reservante, 5, 0);
    expect(resultado.turnoCancelado.estado).toBe('cancelado');
    expect(resultado.turnoReservado.estado).toBe('reservado');
    expect(resultado.turnoReservado.id).toBe(turnoNuevoId);
  });

  it('rechaza (Zod) cuando el turno nuevo es el mismo que el actual, sin tocar el repositorio', async () => {
    const { repositorioTurnos } = crearFakes();
    const caso = new ReprogramarTurnoCommand(repositorioTurnos);

    await expect(
      caso.ejecutar({ datosCrudos: { turnoActualId, turnoNuevoId: turnoActualId }, usuarioId: reservante }),
    ).rejects.toThrow();
    expect(repositorioTurnos.obtenerActual).not.toHaveBeenCalled();
  });

  it('404 / PEA-MUN-003 cuando el turno actual no existe', async () => {
    const { repositorioTurnos } = crearFakes({ actual: null });
    const caso = new ReprogramarTurnoCommand(repositorioTurnos);

    await expect(
      caso.ejecutar({ datosCrudos: { turnoActualId, turnoNuevoId }, usuarioId: reservante }),
    ).rejects.toBeInstanceOf(EventoOTurnoNoEncontradoError);
    expect(repositorioTurnos.reprogramar).not.toHaveBeenCalled();
  });

  it('404 / PEA-MUN-003 cuando el turno actual no está reservado (ya cancelado)', async () => {
    const { repositorioTurnos } = crearFakes({ actual: { ...actualReservado, estado: 'cancelado' } });
    const caso = new ReprogramarTurnoCommand(repositorioTurnos);

    await expect(
      caso.ejecutar({ datosCrudos: { turnoActualId, turnoNuevoId }, usuarioId: reservante }),
    ).rejects.toBeInstanceOf(EventoOTurnoNoEncontradoError);
  });

  it('404 / PEA-MUN-003 cuando el turno nuevo no existe', async () => {
    const { repositorioTurnos } = crearFakes({ nuevo: null });
    const caso = new ReprogramarTurnoCommand(repositorioTurnos);

    await expect(
      caso.ejecutar({ datosCrudos: { turnoActualId, turnoNuevoId }, usuarioId: reservante }),
    ).rejects.toBeInstanceOf(EventoOTurnoNoEncontradoError);
    expect(repositorioTurnos.reprogramar).not.toHaveBeenCalled();
  });

  it('403 / PEA-SIS-002 cuando quien invoca no es el reservante del turno actual', async () => {
    const { repositorioTurnos } = crearFakes();
    const caso = new ReprogramarTurnoCommand(repositorioTurnos);

    await expect(
      caso.ejecutar({ datosCrudos: { turnoActualId, turnoNuevoId }, usuarioId: 'otro-usuario' }),
    ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioTurnos.reprogramar).not.toHaveBeenCalled();
  });

  it('el proveedor del turno actual NO puede reprogramar en nombre del reservante (a diferencia de cancelar)', async () => {
    const { repositorioTurnos } = crearFakes();
    const caso = new ReprogramarTurnoCommand(repositorioTurnos);

    await expect(
      caso.ejecutar({ datosCrudos: { turnoActualId, turnoNuevoId }, usuarioId: proveedor }),
    ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
  });

  it('AC (Paso 2, "todo o nada"): si la transacción falla (turno nuevo ya tomado), responde 409 / PEA-MUN-001', async () => {
    const { repositorioTurnos } = crearFakes({ reprogramarDevuelve: null });
    const caso = new ReprogramarTurnoCommand(repositorioTurnos);

    await expect(
      caso.ejecutar({ datosCrudos: { turnoActualId, turnoNuevoId }, usuarioId: reservante }),
    ).rejects.toBeInstanceOf(TurnoYaReservadoError);
  });
});
