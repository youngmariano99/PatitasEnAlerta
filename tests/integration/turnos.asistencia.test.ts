/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  IRepositorioTurnos,
  TasaNoShow,
  TurnoActual,
  TurnoAsistioActualizado,
} from '@dominio/puertos/IRepositorioTurnos';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { POST as marcarAsistencia } from '@app/api/turnos/marcar-asistencia/route';
import { GET as obtenerTasaNoShow } from '@app/api/turnos/mi-tasa-no-show/route';

const TURNO_ID = '11111111-1111-1111-1111-111111111111';
const PROVEEDOR_ID = '22222222-2222-2222-2222-222222222222';
const OTRO_USUARIO_ID = '33333333-3333-3333-3333-333333333333';

class RepositorioTurnosFalso implements IRepositorioTurnos {
  public turnoActual: TurnoActual | null = {
    id: TURNO_ID,
    estado: 'reservado',
    version: 0,
    reservadoPor: OTRO_USUARIO_ID,
    proveedorId: PROVEEDOR_ID,
  };
  public permiteActualizar = true;
  public tasa: TasaNoShow = { totalConcluidos: 8, totalNoShow: 2, tasa: 0.25 };

  async contarDisponiblesPorEvento(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async crearLote(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async obtenerActual(): Promise<TurnoActual | null> {
    return this.turnoActual;
  }

  async reservar(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarPropios(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async cancelar(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async reprogramar(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarFranjasExistentes(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async listarReservadosPorProveedor(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarReservadosEnVentana(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async actualizarAsistio(
    turnoId: string,
    proveedorId: string,
    asistio: boolean,
  ): Promise<TurnoAsistioActualizado | null> {
    if (!this.permiteActualizar) return null;
    return { id: turnoId, asistio };
  }

  async calcularTasaNoShow(): Promise<TasaNoShow> {
    return this.tasa;
  }

  async listarPorEvento() {
    return [];
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId
      ? { data: { user: { id: usuarioId } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequestMarcarAsistencia(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/turnos/marcar-asistencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function crearRequestTasaNoShow(): NextRequest {
  return new NextRequest('http://localhost/api/turnos/mi-tasa-no-show');
}

describe('POST /api/turnos/marcar-asistencia (Módulo 6, Paso 2)', () => {
  let repositorioTurnos: RepositorioTurnosFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioTurnos = new RepositorioTurnosFalso();
    container.reset();
    container.registerInstance<IRepositorioTurnos>('IRepositorioTurnos', repositorioTurnos);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await marcarAsistencia(
      crearRequestMarcarAsistencia({ turnoId: TURNO_ID, asistio: true }),
    );

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('el proveedor marca asistencia sobre un turno ya concluido (200)', async () => {
    autenticarComo(PROVEEDOR_ID);

    const respuesta = await marcarAsistencia(
      crearRequestMarcarAsistencia({ turnoId: TURNO_ID, asistio: true }),
    );

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ id: TURNO_ID, asistio: true });
  });

  it('AC: rechaza con 403 / PEA-SIS-002 a quien no es el proveedor del turno (ni siquiera el reservante)', async () => {
    autenticarComo(OTRO_USUARIO_ID);

    const respuesta = await marcarAsistencia(
      crearRequestMarcarAsistencia({ turnoId: TURNO_ID, asistio: true }),
    );

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it('rechaza con 404 / PEA-MUN-003 si el turno no existe', async () => {
    autenticarComo(PROVEEDOR_ID);
    repositorioTurnos.turnoActual = null;

    const respuesta = await marcarAsistencia(
      crearRequestMarcarAsistencia({ turnoId: TURNO_ID, asistio: true }),
    );

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-003');
  });

  it('AC: rechaza con 409 / PEA-VETADV-005 si la franja todavía no concluyó', async () => {
    autenticarComo(PROVEEDOR_ID);
    repositorioTurnos.permiteActualizar = false;

    const respuesta = await marcarAsistencia(
      crearRequestMarcarAsistencia({ turnoId: TURNO_ID, asistio: false }),
    );

    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-VETADV-005');
  });
});

describe('GET /api/turnos/mi-tasa-no-show (Módulo 6, Paso 3)', () => {
  let repositorioTurnos: RepositorioTurnosFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioTurnos = new RepositorioTurnosFalso();
    container.reset();
    container.registerInstance<IRepositorioTurnos>('IRepositorioTurnos', repositorioTurnos);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await obtenerTasaNoShow(crearRequestTasaNoShow());

    expect(respuesta.status).toBe(401);
  });

  it('devuelve la tasa agregada sobre los turnos propios del proveedor (200)', async () => {
    autenticarComo(PROVEEDOR_ID);

    const respuesta = await obtenerTasaNoShow(crearRequestTasaNoShow());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ totalConcluidos: 8, totalNoShow: 2, tasa: 0.25 });
  });
});
