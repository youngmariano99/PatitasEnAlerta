/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Comando OfrecerseComoColaboradorCommand" (Módulo 5):
 * intenta ofrecerse dos veces a la misma solicitud y espera PEA-RED-002 (409)
 * en el segundo intento, sin crear una segunda fila en `colaboraciones`.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { DatosNuevaColaboracion, ColaboracionPropuesta, IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';
import type { IRepositorioSolicitudesRecurso, SolicitudActual } from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { DatosNotificacion, INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { POST } from '@app/api/red-colaboracion/solicitudes/[id]/colaboraciones/route';

const SOLICITUD_ID = '11111111-1111-1111-1111-111111111111';
const ORGANIZACION_ID = '22222222-2222-2222-2222-222222222222';
const STAKEHOLDER_ID = '33333333-3333-3333-3333-333333333333';

class RepositorioSolicitudesFalso implements IRepositorioSolicitudesRecurso {
  public actual: SolicitudActual | null = { estado: 'abierta', organizacionId: ORGANIZACION_ID };

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async obtenerActual(): Promise<SolicitudActual | null> {
    return this.actual;
  }

  async listarAsistenciaVeterinariaAbiertas(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

class RepositorioColaboracionesFalso implements IRepositorioColaboraciones {
  public creadas: DatosNuevaColaboracion[] = [];

  async obtenerActual(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async actualizarEstado(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarHistorialEstado(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async existePropuestaDe(solicitudId: string, stakeholderId: string): Promise<boolean> {
    return this.creadas.some((c) => c.solicitudId === solicitudId && c.stakeholderId === stakeholderId);
  }

  async crear(datos: DatosNuevaColaboracion): Promise<ColaboracionPropuesta> {
    this.creadas.push(datos);
    return {
      id: `colaboracion-${this.creadas.length}`,
      solicitudId: datos.solicitudId,
      stakeholderId: datos.stakeholderId,
      organizacionId: ORGANIZACION_ID,
      estado: 'propuesta',
      createdAt: new Date('2026-09-14T10:00:00.000Z'),
    };
  }

  async obtenerMetricasPropias(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'rescatista';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'rescatista@ejemplo.test', rol: this.rol, estadoVerificacion: 'no_requerido', verificadoEn: null };
  }
}

class NotificacionesRepositorioFalso implements INotificacionesRepositorio {
  public creadas: DatosNotificacion[] = [];

  async existePorReferencia(): Promise<boolean> {
    return false;
  }

  async crear(datos: DatosNotificacion): Promise<void> {
    this.creadas.push(datos);
  }

  async listarPorUsuario(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async marcarComoLeida(): Promise<boolean> {
    throw new Error('no usado en este test');
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/red-colaboracion/solicitudes/${SOLICITUD_ID}/colaboraciones`, { method: 'POST' });
}

describe('POST /api/red-colaboracion/solicitudes/[id]/colaboraciones (Ofrecimiento como colaborador)', () => {
  let repositorioSolicitudes: RepositorioSolicitudesFalso;
  let repositorioColaboraciones: RepositorioColaboracionesFalso;
  let repositorioPerfil: RepositorioPerfilFalso;
  let repositorioNotificaciones: NotificacionesRepositorioFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioSolicitudes = new RepositorioSolicitudesFalso();
    repositorioColaboraciones = new RepositorioColaboracionesFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    repositorioNotificaciones = new NotificacionesRepositorioFalso();
    container.reset();
    container.registerInstance<IRepositorioSolicitudesRecurso>('IRepositorioSolicitudesRecurso', repositorioSolicitudes);
    container.registerInstance<IRepositorioColaboraciones>('IRepositorioColaboraciones', repositorioColaboraciones);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', repositorioNotificaciones);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001), sin persistir nada', async () => {
    autenticarComo(null);

    const respuesta = await POST(crearRequest(), { params: { id: SOLICITUD_ID } });

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
    expect(repositorioColaboraciones.creadas).toHaveLength(0);
  });

  it.each(['dueño', 'organizacion', 'municipio', 'administrador'])(
    'rechaza con 403 / PEA-SIS-002 para un usuario con rol %s',
    async (rol) => {
      autenticarComo(STAKEHOLDER_ID);
      repositorioPerfil.rol = rol;

      const respuesta = await POST(crearRequest(), { params: { id: SOLICITUD_ID } });

      expect(respuesta.status).toBe(403);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-002');
      expect(repositorioColaboraciones.creadas).toHaveLength(0);
    },
  );

  it('rechaza con 404 / PEA-RED-003 si la solicitud no existe', async () => {
    autenticarComo(STAKEHOLDER_ID);
    repositorioSolicitudes.actual = null;

    const respuesta = await POST(crearRequest(), { params: { id: SOLICITUD_ID } });

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-RED-003');
  });

  it('rechaza con 409 / PEA-RED-001 si la solicitud ya no está abierta', async () => {
    autenticarComo(STAKEHOLDER_ID);
    repositorioSolicitudes.actual = { estado: 'cubierta', organizacionId: ORGANIZACION_ID };

    const respuesta = await POST(crearRequest(), { params: { id: SOLICITUD_ID } });

    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-RED-001');
  });

  it('crea la colaboración (201, estado "propuesta") y notifica a la organización dueña', async () => {
    autenticarComo(STAKEHOLDER_ID);

    const respuesta = await POST(crearRequest(), { params: { id: SOLICITUD_ID } });

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toMatchObject({ solicitudId: SOLICITUD_ID, stakeholderId: STAKEHOLDER_ID, estado: 'propuesta' });
    expect(repositorioColaboraciones.creadas).toEqual([{ solicitudId: SOLICITUD_ID, stakeholderId: STAKEHOLDER_ID }]);
    expect(repositorioNotificaciones.creadas).toEqual([
      { usuarioId: ORGANIZACION_ID, tipo: 'colaboracion_propuesta', referenciaTabla: 'colaboraciones', referenciaId: cuerpo.id },
    ]);
  });

  it('intenta ofrecerse dos veces a la misma solicitud: la segunda vez rechaza con 409 / PEA-RED-002, sin crear una segunda fila', async () => {
    autenticarComo(STAKEHOLDER_ID);

    const primeraRespuesta = await POST(crearRequest(), { params: { id: SOLICITUD_ID } });
    expect(primeraRespuesta.status).toBe(201);

    const segundaRespuesta = await POST(crearRequest(), { params: { id: SOLICITUD_ID } });

    expect(segundaRespuesta.status).toBe(409);
    const cuerpo = await segundaRespuesta.json();
    expect(cuerpo.codigo).toBe('PEA-RED-002');
    expect(cuerpo.mensaje).toContain('Ya te ofreciste');
    expect(repositorioColaboraciones.creadas).toHaveLength(1);
  });

  it('dos stakeholders distintos pueden ofrecerse a la misma solicitud abierta (sin falso positivo de duplicado)', async () => {
    autenticarComo(STAKEHOLDER_ID);
    await POST(crearRequest(), { params: { id: SOLICITUD_ID } });

    const otroStakeholderId = '55555555-5555-5555-5555-555555555555';
    autenticarComo(otroStakeholderId);
    repositorioPerfil.rol = 'veterinario';
    const respuesta = await POST(crearRequest(), { params: { id: SOLICITUD_ID } });

    expect(respuesta.status).toBe(201);
    expect(repositorioColaboraciones.creadas).toHaveLength(2);
  });
});
