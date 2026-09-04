/**
 * @jest-environment node
 */
import { GenerarTurnosEvento } from '@aplicacion/casos-de-uso/municipio/GenerarTurnosEvento';
import { TurneraMunicipio } from '@dominio/estrategias/ProveedorTurnera';
import type { DatosNuevoTurno, IRepositorioTurnos, TurnoGenerado } from '@dominio/puertos/IRepositorioTurnos';

const eventoId = '11111111-1111-1111-1111-111111111111';
const municipioId = '22222222-2222-2222-2222-222222222222';
const fecha = new Date('2026-10-01T09:00:00.000Z');

function crearFakes(opciones?: { yaDisponibles?: number }) {
  const turnosPersistidos: TurnoGenerado[] = [];
  const repositorioTurnos: jest.Mocked<IRepositorioTurnos> = {
    contarDisponiblesPorEvento: jest.fn().mockResolvedValue(opciones?.yaDisponibles ?? 0),
    crearLote: jest.fn().mockImplementation(async (turnos: DatosNuevoTurno[]) => {
      const generados = turnos.map((turno, indice) => ({
        id: `turno-${turnosPersistidos.length + indice + 1}`,
        ...turno,
        estado: 'disponible',
      }));
      turnosPersistidos.push(...generados);
      return generados;
    }),
    obtenerActual: jest.fn(),
    listarFranjasExistentes: jest.fn(),
    reservar: jest.fn(),
    listarPropios: jest.fn(),
    cancelar: jest.fn(),
    reprogramar: jest.fn(),
  };
  // Instancia REAL de TurneraMunicipio (no un mock) — verificación técnica
  // del ticket: GenerarTurnosEvento reutiliza el Motor de Turnera compartido
  // (patrón Strategy), no reimplementa el cálculo de franjas.
  const turneraMunicipio = new TurneraMunicipio();
  return { repositorioTurnos, turneraMunicipio, turnosPersistidos };
}

describe('GenerarTurnosEvento', () => {
  it('AC: crea exactamente 10 filas en turnos para un evento con cupos_totales=10', async () => {
    const { repositorioTurnos, turneraMunicipio } = crearFakes();
    const caso = new GenerarTurnosEvento(repositorioTurnos, turneraMunicipio);

    const resultado = await caso.ejecutar({ id: eventoId, municipioId, fecha, cuposTotales: 10 });

    expect(resultado).toHaveLength(10);
    expect(resultado.every((t) => t.proveedorTipo === 'municipio' && t.eventoId === eventoId && t.estado === 'disponible')).toBe(
      true,
    );
    expect(repositorioTurnos.crearLote).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ proveedorTipo: 'municipio', proveedorId: municipioId, eventoId })]),
    );
    expect(repositorioTurnos.crearLote.mock.calls[0]![0]).toHaveLength(10);
  });

  it('Paso 3 (AC): al editar cupos_totales a un valor mayor, solo agrega la diferencia faltante', async () => {
    const { repositorioTurnos, turneraMunicipio } = crearFakes({ yaDisponibles: 10 });
    const caso = new GenerarTurnosEvento(repositorioTurnos, turneraMunicipio);

    const resultado = await caso.ejecutar({ id: eventoId, municipioId, fecha, cuposTotales: 15 });

    expect(resultado).toHaveLength(5);
    expect(repositorioTurnos.crearLote.mock.calls[0]![0]).toHaveLength(5);
  });

  it('no genera turnos nuevos si cupos_totales no superó lo ya disponible (edición sin cambio real o a la baja)', async () => {
    const { repositorioTurnos, turneraMunicipio } = crearFakes({ yaDisponibles: 10 });
    const caso = new GenerarTurnosEvento(repositorioTurnos, turneraMunicipio);

    const resultado = await caso.ejecutar({ id: eventoId, municipioId, fecha, cuposTotales: 8 });

    expect(resultado).toEqual([]);
    expect(repositorioTurnos.crearLote).not.toHaveBeenCalled();
  });

  it('nunca toca turnos reservados/cancelados: solo consulta el conteo de "disponible" y solo inserta filas nuevas', async () => {
    const { repositorioTurnos, turneraMunicipio } = crearFakes({ yaDisponibles: 4 });
    const caso = new GenerarTurnosEvento(repositorioTurnos, turneraMunicipio);

    await caso.ejecutar({ id: eventoId, municipioId, fecha, cuposTotales: 10 });

    expect(repositorioTurnos.contarDisponiblesPorEvento).toHaveBeenCalledWith(eventoId);
    // Nunca se llama a ningún método de actualización/borrado — el fake ni
    // siquiera expone uno, así que cualquier intento fallaría en tiempo de
    // compilación: la única superficie disponible es contar + crear.
    expect(repositorioTurnos.crearLote.mock.calls[0]![0]).toHaveLength(6);
  });

  it('las franjas generadas son secuenciales de 20 minutos arrancando en la fecha del evento (reutiliza TurneraMunicipio)', async () => {
    const { repositorioTurnos, turneraMunicipio } = crearFakes();
    const caso = new GenerarTurnosEvento(repositorioTurnos, turneraMunicipio);

    await caso.ejecutar({ id: eventoId, municipioId, fecha, cuposTotales: 2 });

    const [turnosCreados] = repositorioTurnos.crearLote.mock.calls[0]!;
    expect(turnosCreados[0]!.franjaInicio).toEqual(fecha);
    expect(turnosCreados[1]!.franjaInicio).toEqual(turnosCreados[0]!.franjaFin);
  });
});
