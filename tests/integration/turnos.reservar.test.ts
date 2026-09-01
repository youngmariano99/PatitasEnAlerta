/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  DatosNuevoTurno,
  IRepositorioTurnos,
  TurnoActual,
  TurnoGenerado,
  TurnoReservado,
} from '@dominio/puertos/IRepositorioTurnos';
import type { DatosNotificacion, INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';

const turnoId = '11111111-1111-4111-8111-111111111111';
const usuarioA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const usuarioB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// createServerClient se mockea leyendo una cookie propia del test
// ('usuario-simulado') en vez de un getUserMock global compartido: dos
// requests concurrentes (Promise.all) necesitan poder identificarse como
// DOS usuarios distintos al mismo tiempo, algo que un único jest.fn()
// global no puede resolver por request.
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((_url: string, _key: string, opciones: { cookies: { getAll: () => Array<{ name: string; value: string }> } }) => {
    const cookies = opciones.cookies.getAll();
    const usuarioSimulado = cookies.find((c) => c.name === 'usuario-simulado')?.value;
    return {
      auth: {
        getUser: async () =>
          usuarioSimulado
            ? { data: { user: { id: usuarioSimulado } }, error: null }
            : { data: { user: null }, error: { message: 'sin sesión' } },
      },
    };
  }),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/reportes.crear.test.ts).
import { POST } from '@app/api/turnos/reservar/route';

/**
 * Único turno en memoria mutado por `reservar()` — SIN ningún `await`
 * dentro de `obtenerActual`/`reservar` (aunque ambos estén declarados
 * `async`), a propósito: así su lectura+escritura corre de forma atómica
 * dentro del event loop de un único hilo de Node, exactamente lo mismo que
 * garantiza el UPDATE condicionado de Postgres (`WHERE ... AND version=?`)
 * frente a dos transacciones concurrentes reales. Si esta clase tuviera un
 * `await` entre la lectura y la escritura, el test de la carrera de abajo
 * podría (incorrectamente) dejar pasar a los dos usuarios.
 */
class RepositorioTurnosConcurrencia implements IRepositorioTurnos {
  private turno = {
    id: turnoId,
    estado: 'disponible',
    version: 0,
    reservadoPor: null as string | null,
    proveedorId: 'municipio-1',
  };
  public intentosDeReserva: Array<{ reservadoPor: string; versionEsperada: number }> = [];

  async contarDisponiblesPorEvento(): Promise<number> {
    return 0;
  }

  async crearLote(_turnos: DatosNuevoTurno[]): Promise<TurnoGenerado[]> {
    return [];
  }

  async obtenerActual(id: string): Promise<TurnoActual | null> {
    if (id !== this.turno.id) return null;
    return {
      id: this.turno.id,
      estado: this.turno.estado,
      version: this.turno.version,
      reservadoPor: this.turno.reservadoPor,
      proveedorId: this.turno.proveedorId,
    };
  }

  async reservar(id: string, reservadoPor: string, versionEsperada: number): Promise<TurnoReservado | null> {
    this.intentosDeReserva.push({ reservadoPor, versionEsperada });
    if (id !== this.turno.id) return null;
    if (this.turno.estado !== 'disponible' || this.turno.version !== versionEsperada) return null;

    this.turno.estado = 'reservado';
    this.turno.reservadoPor = reservadoPor;
    this.turno.version += 1;
    return { id: this.turno.id, estado: this.turno.estado, reservadoPor, version: this.turno.version };
  }

  async listarPropios(): Promise<{ items: never[]; total: number; pagina: number; porPagina: number }> {
    return { items: [], total: 0, pagina: 1, porPagina: 50 };
  }

  async cancelar(): Promise<null> {
    return null;
  }

  async reprogramar(): Promise<null> {
    return null;
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

function crearRequest(usuarioId: string | null, body: unknown = { turnoId }): NextRequest {
  return new NextRequest('http://localhost/api/turnos/reservar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(usuarioId ? { Cookie: `usuario-simulado=${usuarioId}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/turnos/reservar (Reserva de turno — control optimista de concurrencia)', () => {
  let repositorioTurnos: RepositorioTurnosConcurrencia;
  let repositorioNotificaciones: RepositorioNotificacionesFalso;

  beforeEach(() => {
    repositorioTurnos = new RepositorioTurnosConcurrencia();
    repositorioNotificaciones = new RepositorioNotificacionesFalso();
    container.reset();
    container.registerInstance<IRepositorioTurnos>('IRepositorioTurnos', repositorioTurnos);
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', repositorioNotificaciones);
  });

  it('Verificación técnica / AC: dos reservas concurrentes reales (Promise.all, no secuenciales) sobre el mismo turno — solo una tiene éxito', async () => {
    const [respuestaA, respuestaB] = await Promise.all([
      POST(crearRequest(usuarioA)),
      POST(crearRequest(usuarioB)),
    ]);

    const estados = [respuestaA.status, respuestaB.status].sort();
    expect(estados).toEqual([200, 409]);

    const ganadora = respuestaA.status === 200 ? respuestaA : respuestaB;
    const perdedora = respuestaA.status === 200 ? respuestaB : respuestaA;

    const cuerpoGanadora = await ganadora.json();
    expect(cuerpoGanadora.estado).toBe('reservado');
    expect([usuarioA, usuarioB]).toContain(cuerpoGanadora.reservadoPor);

    const cuerpoPerdedora = await perdedora.json();
    expect(cuerpoPerdedora.codigo).toBe('PEA-MUN-001');

    // Ambos intentos SÍ llegaron al UPDATE condicionado (no se descartó
    // ninguno antes de tiempo) — la exclusión mutua ocurrió en el WHERE
    // (estado='disponible' AND version=?), no por una carrera ganada de
    // antemano en la capa HTTP.
    expect(repositorioTurnos.intentosDeReserva).toHaveLength(2);
  });

  it('AC: la reserva exitosa incrementa version, actualiza estado/reservado_por e inserta la notificación turno_confirmado', async () => {
    const respuesta = await POST(crearRequest(usuarioA));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ id: turnoId, estado: 'reservado', reservadoPor: usuarioA, version: 1 });

    expect(repositorioNotificaciones.creadas).toEqual([
      { usuarioId: usuarioA, tipo: 'turno_confirmado', referenciaTabla: 'turnos', referenciaId: turnoId },
    ]);
  });

  it('AC: un turno ya reservado se rechaza con 409 / PEA-MUN-001 en un segundo intento secuencial', async () => {
    const primera = await POST(crearRequest(usuarioA));
    expect(primera.status).toBe(200);

    const segunda = await POST(crearRequest(usuarioB));

    expect(segunda.status).toBe(409);
    const cuerpo = await segunda.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-001');
  });

  it('responde 401 (PEA-SIS-001) sin sesión', async () => {
    const respuesta = await POST(crearRequest(null));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('responde 404 (PEA-MUN-003) si el turno no existe', async () => {
    const respuesta = await POST(crearRequest(usuarioA, { turnoId: '99999999-9999-4999-8999-999999999999' }));

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-003');
  });

  it('responde 400 (PEA-SIS-005) ante un turnoId mal formado', async () => {
    const respuesta = await POST(crearRequest(usuarioA, { turnoId: 'no-es-un-uuid' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });
});
