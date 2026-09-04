/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  DatosNuevoTurno,
  IRepositorioTurnos,
  PaginaTurnosPropios,
  TurnoActual,
  TurnoGenerado,
  TurnoPropio,
  TurnoReservado,
} from '@dominio/puertos/IRepositorioTurnos';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/turnos.reservar.test.ts).
import { GET } from '@app/api/turnos/mis-turnos/route';

/** Turno propio con el dueño de la reserva — `TurnoPropio` (proyección pública) no incluye `reservadoPor`, así que el fake lo guarda aparte para poder filtrar. */
type TurnoConDueno = TurnoPropio & { reservadoPor: string };

/** Simula, en memoria, la tabla `turnos` — filtra/pagina en O(n) por reservado_por, igual que RepositorioReportesEnMemoria en otros tests de integración. */
class RepositorioTurnosEnMemoria implements IRepositorioTurnos {
  public turnos: TurnoConDueno[] = [];

  async contarDisponiblesPorEvento(): Promise<number> {
    return 0;
  }

  async crearLote(_turnos: DatosNuevoTurno[]): Promise<TurnoGenerado[]> {
    return [];
  }

  async obtenerActual(): Promise<TurnoActual | null> {
    return null;
  }

  async reservar(): Promise<TurnoReservado | null> {
    return null;
  }

  async listarPropios(reservadoPor: string, pagina: number, porPagina: number): Promise<PaginaTurnosPropios> {
    // El propio in-memory fake filtra EXCLUSIVAMENTE por reservadoPor, igual
    // que el where real de Prisma — reforzando la verificación técnica del
    // ticket a nivel repositorio, no solo a nivel RLS.
    const propios = this.turnos.filter((t) => t.reservadoPor === reservadoPor);
    const inicio = (pagina - 1) * porPagina;
    return { items: propios.slice(inicio, inicio + porPagina), total: propios.length, pagina, porPagina };
  }

  async cancelar(): Promise<null> {
    return null;
  }

  async reprogramar(): Promise<null> {
    return null;
  }

  async listarFranjasExistentes(): Promise<Date[]> {
    return [];
  }
}

function crearRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/turnos/mis-turnos${query}`, { method: 'GET' });
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

/** Genera N turnos propios para probar paginación (AC: volumen > 50). */
function generarTurnosPropios(cantidad: number, reservadoPor: string): TurnoConDueno[] {
  return Array.from({ length: cantidad }, (_, indice) => ({
    id: `turno-${indice + 1}`,
    proveedorTipo: 'municipio',
    proveedorId: 'municipio-1',
    eventoId: 'evento-1',
    eventoTitulo: `Jornada #${indice + 1}`,
    franjaInicio: new Date(2026, 8, 1 + indice),
    franjaFin: new Date(2026, 8, 1 + indice, 0, 20),
    estado: 'reservado',
    reservadoPor,
  }));
}

describe('GET /api/turnos/mis-turnos (Monitoreo en tiempo real del turno reservado)', () => {
  let repositorioTurnos: RepositorioTurnosEnMemoria;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioTurnos = new RepositorioTurnosEnMemoria();
    container.reset();
    container.registerInstance<IRepositorioTurnos>('IRepositorioTurnos', repositorioTurnos);
  });

  it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('AC/Paso 1: devuelve solo los turnos del usuario autenticado (reservado_por=usuario_actual())', async () => {
    autenticarComo('dueno-1');
    repositorioTurnos.turnos = [
      ...generarTurnosPropios(2, 'dueno-1'),
      ...generarTurnosPropios(3, 'dueno-2'), // de otro usuario — nunca debe aparecer
    ];

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(2);
    expect(cuerpo.total).toBe(2);
  });

  it('AC: aplica paginación server-side (tope 50) con más de 50 turnos propios', async () => {
    autenticarComo('dueno-1');
    repositorioTurnos.turnos = generarTurnosPropios(75, 'dueno-1');

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(50);
    expect(cuerpo.total).toBe(75);
    expect(cuerpo.porPagina).toBe(50);
  });

  it('ignora un porPagina por encima de 50 y aplica el tope', async () => {
    autenticarComo('dueno-1');
    repositorioTurnos.turnos = generarTurnosPropios(75, 'dueno-1');

    const respuesta = await GET(crearRequest('?porPagina=200'));

    const cuerpo = await respuesta.json();
    expect(cuerpo.porPagina).toBe(50);
    expect(cuerpo.items).toHaveLength(50);
  });

  it('devuelve una página vacía cuando el usuario no reservó ningún turno', async () => {
    autenticarComo('dueno-sin-turnos');
    repositorioTurnos.turnos = generarTurnosPropios(5, 'dueno-1');

    const respuesta = await GET(crearRequest());

    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toEqual([]);
    expect(cuerpo.total).toBe(0);
  });
});
