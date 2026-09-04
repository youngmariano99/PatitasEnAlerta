/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  DatosNuevoTurno,
  IRepositorioTurnos,
  PaginaTurnosPropios,
  PaginaTurnosReservadosVeterinario,
  TurnoActual,
  TurnoGenerado,
  TurnoReservado,
  TurnoReservadoVeterinario,
} from '@dominio/puertos/IRepositorioTurnos';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/turnos.misTurnos.test.ts).
import { GET } from '@app/api/veterinarios/turnos/route';

/** Turno reservado con su proveedor — la proyección pública no incluye `proveedorId`, así que el fake lo guarda aparte para poder filtrar. */
type TurnoConProveedor = TurnoReservadoVeterinario & { proveedorId: string };

/** Simula, en memoria, la tabla `turnos` filtrada a `estado='reservado'` — filtra/pagina en O(n) por proveedor_id, igual que RepositorioTurnosEnMemoria en turnos.misTurnos.test.ts. */
class RepositorioTurnosEnMemoria implements IRepositorioTurnos {
  public turnos: TurnoConProveedor[] = [];

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

  async listarPropios(): Promise<PaginaTurnosPropios> {
    return { items: [], total: 0, pagina: 1, porPagina: 50 };
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

  async listarReservadosPorProveedor(proveedorId: string, pagina: number, porPagina: number): Promise<PaginaTurnosReservadosVeterinario> {
    // El propio in-memory fake filtra EXCLUSIVAMENTE por proveedorId, igual
    // que el where real de Prisma — reforzando la verificación técnica del
    // ticket a nivel repositorio, no solo a nivel RLS.
    const propios = this.turnos.filter((t) => t.proveedorId === proveedorId);
    const inicio = (pagina - 1) * porPagina;
    return { items: propios.slice(inicio, inicio + porPagina), total: propios.length, pagina, porPagina };
  }
}

function crearRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/veterinarios/turnos${query}`, { method: 'GET' });
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

/** Genera N turnos reservados para probar paginación (AC: volumen > 50). */
function generarTurnosReservados(cantidad: number, proveedorId: string): TurnoConProveedor[] {
  return Array.from({ length: cantidad }, (_, indice) => ({
    id: `turno-${indice + 1}`,
    proveedorId,
    franjaInicio: new Date(2026, 8, 1 + indice),
    franjaFin: new Date(2026, 8, 1 + indice, 0, 20),
    reservadoPorEmail: `dueno-${indice + 1}@example.com`,
  }));
}

describe('GET /api/veterinarios/turnos (Listado de turnos reservados del veterinario)', () => {
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

  it('AC: devuelve solo los turnos de la agenda propia (proveedor_id=usuario_actual())', async () => {
    autenticarComo('veterinario-1');
    repositorioTurnos.turnos = [
      ...generarTurnosReservados(2, 'veterinario-1'),
      ...generarTurnosReservados(3, 'veterinario-2'), // de otro veterinario — nunca debe aparecer
    ];

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(2);
    expect(cuerpo.total).toBe(2);
  });

  it('AC: aplica paginación server-side (tope 50) con más de 50 turnos reservados', async () => {
    autenticarComo('veterinario-1');
    repositorioTurnos.turnos = generarTurnosReservados(75, 'veterinario-1');

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(50);
    expect(cuerpo.total).toBe(75);
    expect(cuerpo.porPagina).toBe(50);
  });

  it('ignora un porPagina por encima de 50 y aplica el tope', async () => {
    autenticarComo('veterinario-1');
    repositorioTurnos.turnos = generarTurnosReservados(75, 'veterinario-1');

    const respuesta = await GET(crearRequest('?porPagina=200'));

    const cuerpo = await respuesta.json();
    expect(cuerpo.porPagina).toBe(50);
    expect(cuerpo.items).toHaveLength(50);
  });

  it('devuelve una página vacía cuando el veterinario no tiene turnos reservados', async () => {
    autenticarComo('veterinario-sin-turnos');
    repositorioTurnos.turnos = generarTurnosReservados(5, 'veterinario-1');

    const respuesta = await GET(crearRequest());

    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toEqual([]);
    expect(cuerpo.total).toBe(0);
  });
});
