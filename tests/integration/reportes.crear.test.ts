/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  CriteriosCoincidenciaReporte,
  DatosNuevoReporte,
  FiltrosListadoReportes,
  IRepositorioReportes,
  PaginaReportes,
  ReporteActivoResumen,
} from '@dominio/puertos/IRepositorioReportes';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import type { DatosNotificacion, INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import type { DatosReporte } from '@dominio/entidades/Reporte';
import { Reporte } from '@dominio/entidades/Reporte';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, así que el orden de imports acá abajo no afecta el
// mockeo real (mismo criterio que tests/integration/mascotas.registro.test.ts).
import { POST } from '@app/api/reportes/route';

class RepositorioReportesFalso implements IRepositorioReportes {
  public creados: DatosNuevoReporte[] = [];
  public llamadasBusquedaCoincidencias: CriteriosCoincidenciaReporte[] = [];
  public coincidenciasARetornar: ReporteActivoResumen[] = [];

  async crear(datos: DatosNuevoReporte): Promise<Reporte> {
    this.creados.push(datos);
    const entidad: DatosReporte = { ...datos, estado: 'reportado' };
    return Reporte.reconstruir(`reporte-${this.creados.length}`, entidad, new Date('2026-08-01T12:00:00.000Z'));
  }

  async buscarPerdidosActivosPorZonaYEspecie(criterios: CriteriosCoincidenciaReporte): Promise<ReporteActivoResumen[]> {
    this.llamadasBusquedaCoincidencias.push(criterios);
    return this.coincidenciasARetornar;
  }

  async listar(_filtros: FiltrosListadoReportes, _pagina: number, _porPagina: number): Promise<PaginaReportes> {
    throw new Error('no usado en este test — ver tests/integration/reportes.listar.test.ts');
  }
}

class NotificacionesRepositorioFalso implements INotificacionesRepositorio {
  public creadas: DatosNotificacion[] = [];

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

class AlmacenamientoImagenesFalso implements IAlmacenamientoImagenes {
  esUrlDeImagenValida(url: string): boolean {
    return url.startsWith('https://res.cloudinary.com/patitas-en-alerta/');
  }
}

class ControlDeTasaFalso implements IControlDeTasa {
  public permitido = true;

  async permitir(): Promise<boolean> {
    return this.permitido;
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/reportes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fotoValida = 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg';
const reporteValido = {
  tipo: 'perdido',
  descripcion: 'Se perdió cerca de la plaza, responde a su nombre.',
  fotoUrl: fotoValida,
  latitud: -37.9989,
  longitud: -61.3565,
};

describe('POST /api/reportes (REP-01/REP-02/REP-03, CrearReporte)', () => {
  let repositorioReportes: RepositorioReportesFalso;
  let repositorioNotificaciones: NotificacionesRepositorioFalso;
  let controlDeTasa: ControlDeTasaFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioReportes = new RepositorioReportesFalso();
    repositorioNotificaciones = new NotificacionesRepositorioFalso();
    controlDeTasa = new ControlDeTasaFalso();
    container.reset();
    container.registerInstance<IRepositorioReportes>('IRepositorioReportes', repositorioReportes);
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', repositorioNotificaciones);
    container.registerInstance<IControlDeTasa>('IControlDeTasa', controlDeTasa);
    container.registerSingleton<IAlmacenamientoImagenes>('IAlmacenamientoImagenes', AlmacenamientoImagenesFalso);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001), sin persistir nada', async () => {
    autenticarComo(null);

    const respuesta = await POST(crearRequest(reporteValido));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza sin categoría/tipo (400 / PEA-REP-001), antes de invocar rate limit o Cloudinary', async () => {
    autenticarComo('usuario-1');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tipo: _tipo, ...sinTipo } = reporteValido;

    const respuesta = await POST(crearRequest(sinTipo));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-001');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza sin foto (400 / PEA-REP-002)', async () => {
    autenticarComo('usuario-1');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fotoUrl: _fotoUrl, ...sinFoto } = reporteValido;

    const respuesta = await POST(crearRequest(sinFoto));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-002');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza una ubicación inválida (400 / PEA-REP-003)', async () => {
    autenticarComo('usuario-1');

    const respuesta = await POST(crearRequest({ ...reporteValido, latitud: 0, longitud: 0 }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-003');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza cuando se superó el límite de reportes (429 / PEA-REP-004)', async () => {
    autenticarComo('usuario-1');
    controlDeTasa.permitido = false;

    const respuesta = await POST(crearRequest(reporteValido));

    expect(respuesta.status).toBe(429);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-004');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('publica el reporte "perdido" con éxito, con estado inicial "reportado", y no dispara la búsqueda de coincidencias', async () => {
    autenticarComo('usuario-1');

    const respuesta = await POST(crearRequest(reporteValido));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.estado).toBe('reportado');
    expect(cuerpo.reportadoPor).toBe('usuario-1');
    expect(cuerpo.mascotaId).toBeNull();
    expect(repositorioReportes.creados).toEqual([
      {
        tipo: 'perdido',
        subtipo: null,
        reportadoPor: 'usuario-1',
        mascotaId: null,
        descripcion: reporteValido.descripcion,
        fotoUrl: fotoValida,
        latitud: reporteValido.latitud,
        longitud: reporteValido.longitud,
        especie: null,
      },
    ]);
    expect(repositorioReportes.llamadasBusquedaCoincidencias).toHaveLength(0);
    expect(repositorioNotificaciones.creadas).toHaveLength(0);
  });

  it('publica un reporte "encontrado" sin mascotaId (vecino sin mascota propia registrada)', async () => {
    autenticarComo('vecino-1');

    const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'encontrado', especie: 'perro' }));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.tipo).toBe('encontrado');
    expect(cuerpo.mascotaId).toBeNull();
    expect(repositorioReportes.creados[0]).toMatchObject({ tipo: 'encontrado', mascotaId: null, especie: 'perro' });
  });

  it('un reporte "encontrado" dispara la búsqueda de coincidencias zona/especie contra reportes "perdido" activos', async () => {
    autenticarComo('vecino-1');

    const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'encontrado', especie: 'perro' }));
    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();

    expect(repositorioReportes.llamadasBusquedaCoincidencias).toEqual([
      {
        especie: 'perro',
        latitud: reporteValido.latitud,
        longitud: reporteValido.longitud,
        radioKm: 5,
        excluirReporteId: cuerpo.id,
      },
    ]);
  });

  it('notifica (tipo=reporte_coincidente) al dueño del reporte "perdido" cuando la búsqueda encuentra una coincidencia', async () => {
    autenticarComo('vecino-1');
    repositorioReportes.coincidenciasARetornar = [{ id: 'perdido-1', reportadoPor: 'dueno-1' }];

    const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'encontrado', especie: 'perro' }));
    const cuerpo = await respuesta.json();

    expect(repositorioNotificaciones.creadas).toEqual([
      { usuarioId: 'dueno-1', tipo: 'reporte_coincidente', referenciaTabla: 'reportes', referenciaId: cuerpo.id },
    ]);
  });

  it('sin especie declarada, un reporte "encontrado" igual se publica pero no dispara la búsqueda de coincidencias', async () => {
    autenticarComo('vecino-1');

    const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'encontrado' }));

    expect(respuesta.status).toBe(201);
    expect(repositorioReportes.llamadasBusquedaCoincidencias).toHaveLength(0);
  });

  it('rechaza tipo="problematica" sin subtipo (400 / PEA-REP-001)', async () => {
    autenticarComo('usuario-1');

    const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'problematica' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-001');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza un subtipo fuera del CHECK (animal_suelto | foco_sanitario | accidente_vial) con 400 / PEA-REP-001', async () => {
    autenticarComo('usuario-1');

    const respuesta = await POST(
      crearRequest({ ...reporteValido, tipo: 'problematica', subtipo: 'incendio_forestal' }),
    );

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-001');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('publica un reporte "problematica" con subtipo válido, con mascota_id siempre NULL en la fila persistida', async () => {
    autenticarComo('usuario-1');

    const respuesta = await POST(
      crearRequest({
        ...reporteValido,
        tipo: 'problematica',
        subtipo: 'animal_suelto',
        mascotaId: '11111111-1111-1111-1111-111111111111',
      }),
    );

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.tipo).toBe('problematica');
    expect(cuerpo.subtipo).toBe('animal_suelto');
    expect(cuerpo.mascotaId).toBeNull();
    expect(repositorioReportes.creados[0]).toMatchObject({
      tipo: 'problematica',
      subtipo: 'animal_suelto',
      mascotaId: null,
    });
    expect(repositorioReportes.llamadasBusquedaCoincidencias).toHaveLength(0);
  });

  it.each(['animal_suelto', 'foco_sanitario', 'accidente_vial'])(
    'acepta el subtipo "%s" del CHECK',
    async (subtipo) => {
      autenticarComo('usuario-1');

      const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'problematica', subtipo }));

      expect(respuesta.status).toBe(201);
    },
  );
});
