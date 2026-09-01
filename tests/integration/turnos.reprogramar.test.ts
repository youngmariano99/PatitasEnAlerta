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
  TurnoCancelado,
  TurnoGenerado,
  TurnoReprogramado,
  TurnoReservado,
} from '@dominio/puertos/IRepositorioTurnos';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/turnos.cancelar.test.ts).
import { POST } from '@app/api/turnos/reprogramar/route';

interface FilaTurno {
  id: string;
  estado: string;
  version: number;
  reservadoPor: string | null;
  proveedorId: string;
}

/**
 * Simula, en memoria, la tabla `turnos` — `reprogramar` replica la
 * atomicidad "todo o nada" de una transacción Prisma real: si el segundo
 * paso (reservar el turno nuevo) falla, revierte también el primero
 * (cancelar el actual) ANTES de devolver `null`, nunca deja al turno actual
 * cancelado sin que el nuevo haya quedado reservado (AC del ticket).
 */
class RepositorioTurnosEnMemoria implements IRepositorioTurnos {
  public turnos = new Map<string, FilaTurno>();

  async contarDisponiblesPorEvento(): Promise<number> {
    return 0;
  }

  async crearLote(_turnos: DatosNuevoTurno[]): Promise<TurnoGenerado[]> {
    return [];
  }

  async obtenerActual(id: string): Promise<TurnoActual | null> {
    const fila = this.turnos.get(id);
    if (!fila) return null;
    return { id: fila.id, estado: fila.estado, version: fila.version, reservadoPor: fila.reservadoPor, proveedorId: fila.proveedorId };
  }

  async reservar(): Promise<TurnoReservado | null> {
    return null;
  }

  async cancelar(): Promise<TurnoCancelado | null> {
    return null;
  }

  async listarPropios(): Promise<PaginaTurnosPropios> {
    return { items: [], total: 0, pagina: 1, porPagina: 50 };
  }

  async reprogramar(
    turnoActualId: string,
    turnoNuevoId: string,
    usuarioId: string,
    versionActualEsperada: number,
    versionNuevaEsperada: number,
  ): Promise<TurnoReprogramado | null> {
    const actual = this.turnos.get(turnoActualId);
    const nuevo = this.turnos.get(turnoNuevoId);
    if (!actual || !nuevo) return null;
    if (actual.estado !== 'reservado' || actual.version !== versionActualEsperada) return null;

    // Estado "de trabajo" — solo se confirma en `this.turnos` si AMBOS pasos
    // tienen éxito; si el segundo falla, `actual`/`nuevo` (referencias del
    // Map) nunca se tocan, replicando el rollback de la transacción real.
    if (nuevo.estado !== 'disponible' || nuevo.version !== versionNuevaEsperada) return null;

    actual.estado = 'cancelado';
    actual.version += 1;
    nuevo.estado = 'reservado';
    nuevo.reservadoPor = usuarioId;
    nuevo.version += 1;

    return {
      turnoCancelado: { id: actual.id, estado: actual.estado, reservadoPor: actual.reservadoPor, proveedorId: actual.proveedorId, version: actual.version },
      turnoReservado: { id: nuevo.id, estado: nuevo.estado, reservadoPor: usuarioId, version: nuevo.version },
    };
  }
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/turnos/reprogramar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

const turnoActualId = '11111111-1111-4111-8111-111111111111';
const turnoNuevoId = '22222222-2222-4222-8222-222222222222';
const reservante = '33333333-3333-4333-8333-333333333333';
const proveedor = '44444444-4444-4444-8444-444444444444';
const otroReservante = '55555555-5555-4555-8555-555555555555';

describe('POST /api/turnos/reprogramar (Reprogramación de turno propio — todo o nada)', () => {
  let repositorioTurnos: RepositorioTurnosEnMemoria;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioTurnos = new RepositorioTurnosEnMemoria();
    container.reset();
    container.registerInstance<IRepositorioTurnos>('IRepositorioTurnos', repositorioTurnos);
  });

  it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await POST(crearRequest({ turnoActualId, turnoNuevoId }));

    expect(respuesta.status).toBe(401);
  });

  it('AC (Paso 2): reprograma exitosamente — cancela el actual y reserva el nuevo en una sola operación', async () => {
    autenticarComo(reservante);
    repositorioTurnos.turnos.set(turnoActualId, { id: turnoActualId, estado: 'reservado', version: 2, reservadoPor: reservante, proveedorId: proveedor });
    repositorioTurnos.turnos.set(turnoNuevoId, { id: turnoNuevoId, estado: 'disponible', version: 0, reservadoPor: null, proveedorId: proveedor });

    const respuesta = await POST(crearRequest({ turnoActualId, turnoNuevoId }));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.turnoCancelado).toEqual({ id: turnoActualId, estado: 'cancelado', reservadoPor: reservante, version: 3 });
    expect(cuerpo.turnoReservado).toEqual({ id: turnoNuevoId, estado: 'reservado', reservadoPor: reservante, version: 1 });
  });

  it('AC ("todo o nada"): si el turno nuevo ya fue tomado, el turno actual SIGUE reservado (nada quedó a medio camino)', async () => {
    autenticarComo(reservante);
    repositorioTurnos.turnos.set(turnoActualId, { id: turnoActualId, estado: 'reservado', version: 2, reservadoPor: reservante, proveedorId: proveedor });
    // El turno nuevo ya fue reservado por otro usuario antes de esta request.
    repositorioTurnos.turnos.set(turnoNuevoId, { id: turnoNuevoId, estado: 'reservado', version: 1, reservadoPor: otroReservante, proveedorId: proveedor });

    const respuesta = await POST(crearRequest({ turnoActualId, turnoNuevoId }));

    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-001');

    // Verificación técnica de la atomicidad: el turno actual NUNCA quedó
    // cancelado — sigue 'reservado' con la misma version que tenía.
    const actualTrasElIntento = await repositorioTurnos.obtenerActual(turnoActualId);
    expect(actualTrasElIntento?.estado).toBe('reservado');
    expect(actualTrasElIntento?.version).toBe(2);
  });

  it('rechaza con 403 / PEA-SIS-002 si quien invoca no es el reservante del turno actual', async () => {
    autenticarComo(otroReservante);
    repositorioTurnos.turnos.set(turnoActualId, { id: turnoActualId, estado: 'reservado', version: 2, reservadoPor: reservante, proveedorId: proveedor });
    repositorioTurnos.turnos.set(turnoNuevoId, { id: turnoNuevoId, estado: 'disponible', version: 0, reservadoPor: null, proveedorId: proveedor });

    const respuesta = await POST(crearRequest({ turnoActualId, turnoNuevoId }));

    expect(respuesta.status).toBe(403);
  });

  it('rechaza con 404 / PEA-MUN-003 si el turno actual no existe', async () => {
    autenticarComo(reservante);
    repositorioTurnos.turnos.set(turnoNuevoId, { id: turnoNuevoId, estado: 'disponible', version: 0, reservadoPor: null, proveedorId: proveedor });

    const respuesta = await POST(crearRequest({ turnoActualId: '99999999-9999-4999-8999-999999999999', turnoNuevoId }));

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-003');
  });

  it('rechaza con 400 / PEA-SIS-005 cuando el turno nuevo es igual al actual', async () => {
    autenticarComo(reservante);

    const respuesta = await POST(crearRequest({ turnoActualId, turnoNuevoId: turnoActualId }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });
});
