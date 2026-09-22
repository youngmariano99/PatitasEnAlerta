/**
 * @jest-environment node
 */
import { ListarTurnosPorEvento } from '@aplicacion/casos-de-uso/turnos/ListarTurnosPorEvento';
import type { IRepositorioTurnos, TurnoGenerado } from '@dominio/puertos/IRepositorioTurnos';

const eventoId = '11111111-1111-1111-1111-111111111111';

function crearTurno(id: string, estado: string): TurnoGenerado {
  return {
    id,
    proveedorTipo: 'municipio',
    proveedorId: 'municipio-1',
    eventoId,
    franjaInicio: new Date('2026-09-20T10:00:00.000Z'),
    franjaFin: new Date('2026-09-20T10:30:00.000Z'),
    estado,
  };
}

function crearFakes(turnos: TurnoGenerado[] = [crearTurno('turno-1', 'disponible')]) {
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
    listarReservadosEnVentana: jest.fn(),
    actualizarAsistio: jest.fn(),
    calcularTasaNoShow: jest.fn(),
    listarPorEvento: jest.fn().mockResolvedValue(turnos),
  };
  return { repositorioTurnos };
}

describe('ListarTurnosPorEvento', () => {
  it('devuelve los turnos del evento serializados como ISO 8601', async () => {
    const { repositorioTurnos } = crearFakes();
    const caso = new ListarTurnosPorEvento(repositorioTurnos);

    const resultado = await caso.ejecutar(eventoId);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual({
      id: 'turno-1',
      franjaInicio: '2026-09-20T10:00:00.000Z',
      franjaFin: '2026-09-20T10:30:00.000Z',
      estado: 'disponible',
    });
    expect(repositorioTurnos.listarPorEvento).toHaveBeenCalledWith(eventoId);
  });

  it('incluye turnos en cualquier estado, no solo disponibles', async () => {
    const { repositorioTurnos } = crearFakes([
      crearTurno('t1', 'disponible'),
      crearTurno('t2', 'reservado'),
    ]);
    const caso = new ListarTurnosPorEvento(repositorioTurnos);

    const resultado = await caso.ejecutar(eventoId);

    expect(resultado.map((t) => t.estado)).toEqual(['disponible', 'reservado']);
  });

  it('devuelve un arreglo vacío si el evento no tiene turnos generados', async () => {
    const { repositorioTurnos } = crearFakes([]);
    const caso = new ListarTurnosPorEvento(repositorioTurnos);

    await expect(caso.ejecutar(eventoId)).resolves.toEqual([]);
  });
});
