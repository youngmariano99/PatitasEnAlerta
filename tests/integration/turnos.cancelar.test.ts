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
import type { DatosNotificacion, INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/turnos.reservar.test.ts).
import { POST } from '@app/api/turnos/cancelar/route';

interface FilaTurno {
  id: string;
  estado: string;
  version: number;
  reservadoPor: string | null;
  proveedorId: string;
}

/** Simula, en memoria, la tabla `turnos` — sin ningún `await` entre lectura y escritura dentro de `cancelar`, igual que RepositorioTurnosConcurrencia en tests/integration/turnos.reservar.test.ts. */
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

  async listarPropios(): Promise<PaginaTurnosPropios> {
    return { items: [], total: 0, pagina: 1, porPagina: 50 };
  }

  async cancelar(id: string, versionEsperada: number): Promise<TurnoCancelado | null> {
    const fila = this.turnos.get(id);
    if (!fila || fila.estado !== 'reservado' || fila.version !== versionEsperada) return null;

    fila.estado = 'cancelado';
    fila.version += 1;
    return { id: fila.id, estado: fila.estado, reservadoPor: fila.reservadoPor, proveedorId: fila.proveedorId, version: fila.version };
  }

  async reprogramar(): Promise<TurnoReprogramado | null> {
    return null;
  }

  async listarFranjasExistentes(): Promise<Date[]> {
    return [];
  }

  async listarReservadosPorProveedor() {
    return { items: [], total: 0, pagina: 1, porPagina: 50 };
  }
}

class RepositorioNotificacionesFalso implements INotificacionesRepositorio {
  public creadas: DatosNotificacion[] = [];

  async crear(datos: DatosNotificacion): Promise<void> {
    this.creadas.push(datos);
  }

  async listarPorUsuario(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async marcarComoLeida(): Promise<boolean> {
    return false;
  }
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/turnos/cancelar', {
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

const turnoId = '11111111-1111-4111-8111-111111111111';
const reservante = '22222222-2222-4222-8222-222222222222';
const proveedor = '33333333-3333-4333-8333-333333333333';
const otroUsuario = '44444444-4444-4444-8444-444444444444';

describe('POST /api/turnos/cancelar (Cancelación de turno propio)', () => {
  let repositorioTurnos: RepositorioTurnosEnMemoria;
  let repositorioNotificaciones: RepositorioNotificacionesFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioTurnos = new RepositorioTurnosEnMemoria();
    repositorioNotificaciones = new RepositorioNotificacionesFalso();
    container.reset();
    container.registerInstance<IRepositorioTurnos>('IRepositorioTurnos', repositorioTurnos);
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', repositorioNotificaciones);
  });

  it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await POST(crearRequest({ turnoId }));

    expect(respuesta.status).toBe(401);
  });

  it('AC: el reservante cancela su propio turno — 200, estado=cancelado, libera el cupo (queda visible para el proveedor)', async () => {
    autenticarComo(reservante);
    repositorioTurnos.turnos.set(turnoId, { id: turnoId, estado: 'reservado', version: 2, reservadoPor: reservante, proveedorId: proveedor });

    const respuesta = await POST(crearRequest({ turnoId }));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.estado).toBe('cancelado');
    expect(cuerpo.version).toBe(3);
  });

  it('AC (Paso 3): notifica tipo=turno_cancelado al proveedor cuando cancela el reservante', async () => {
    autenticarComo(reservante);
    repositorioTurnos.turnos.set(turnoId, { id: turnoId, estado: 'reservado', version: 2, reservadoPor: reservante, proveedorId: proveedor });

    await POST(crearRequest({ turnoId }));

    expect(repositorioNotificaciones.creadas).toEqual([
      { usuarioId: proveedor, tipo: 'turno_cancelado', referenciaTabla: 'turnos', referenciaId: turnoId },
    ]);
  });

  it('el proveedor puede cancelar el turno de un reservante y no se notifica a sí mismo', async () => {
    autenticarComo(proveedor);
    repositorioTurnos.turnos.set(turnoId, { id: turnoId, estado: 'reservado', version: 2, reservadoPor: reservante, proveedorId: proveedor });

    const respuesta = await POST(crearRequest({ turnoId }));

    expect(respuesta.status).toBe(200);
    expect(repositorioNotificaciones.creadas).toEqual([]);
  });

  it('AC: un usuario que no es el reservante ni el proveedor recibe 403 / PEA-SIS-002', async () => {
    autenticarComo(otroUsuario);
    repositorioTurnos.turnos.set(turnoId, { id: turnoId, estado: 'reservado', version: 2, reservadoPor: reservante, proveedorId: proveedor });

    const respuesta = await POST(crearRequest({ turnoId }));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it('AC/Paso 4: cancelar un turno inexistente responde 404 / PEA-MUN-003', async () => {
    autenticarComo(reservante);

    const respuesta = await POST(crearRequest({ turnoId: '99999999-9999-4999-8999-999999999999' }));

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-003');
  });

  it('AC/Paso 4: cancelar un turno ya cancelado responde 404 / PEA-MUN-003', async () => {
    autenticarComo(reservante);
    repositorioTurnos.turnos.set(turnoId, { id: turnoId, estado: 'cancelado', version: 3, reservadoPor: reservante, proveedorId: proveedor });

    const respuesta = await POST(crearRequest({ turnoId }));

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-003');
  });

  it('cancelar un turno que nunca fue reservado (estado disponible) también responde 404 / PEA-MUN-003', async () => {
    autenticarComo(reservante);
    repositorioTurnos.turnos.set(turnoId, { id: turnoId, estado: 'disponible', version: 0, reservadoPor: null, proveedorId: proveedor });

    const respuesta = await POST(crearRequest({ turnoId }));

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-003');
  });

  it('responde 400 / PEA-SIS-005 ante un turnoId mal formado', async () => {
    autenticarComo(reservante);

    const respuesta = await POST(crearRequest({ turnoId: 'no-es-un-uuid' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });
});
