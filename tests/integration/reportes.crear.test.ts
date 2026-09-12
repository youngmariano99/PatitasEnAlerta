/**
 * @jest-environment node
 */
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import type { IControlDeTasaConReintento } from '@dominio/puertos/IControlDeTasaConReintento';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import {
  AlmacenamientoImagenesFalso,
  ControlDeTasaAntiSaturacionFalso,
  ControlDeTasaFalso,
  NotificacionesRepositorioFalso,
  RepositorioPerfilFalso,
  RepositorioReportesFalso,
  autenticarComo,
  crearRequest,
  fotoValida,
  reporteValido,
} from './reportes.crear.fixtures';

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

// Casos de tipo='problematica' viven en reportes.crear.problematica.test.ts
// (mismos fakes de reportes.crear.fixtures.ts) — split para respetar el
// límite de 300 líneas por archivo (CLAUDE.md).
describe('POST /api/reportes (REP-01/REP-02/REP-03, CrearReporte)', () => {
  let repositorioReportes: RepositorioReportesFalso;
  let repositorioNotificaciones: NotificacionesRepositorioFalso;
  let controlDeTasa: ControlDeTasaFalso;
  let controlDeTasaAntiSaturacion: ControlDeTasaAntiSaturacionFalso;
  let repositorioPerfil: RepositorioPerfilFalso;
  let almacenamientoImagenes: AlmacenamientoImagenesFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioReportes = new RepositorioReportesFalso();
    repositorioNotificaciones = new NotificacionesRepositorioFalso();
    controlDeTasa = new ControlDeTasaFalso();
    controlDeTasaAntiSaturacion = new ControlDeTasaAntiSaturacionFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    almacenamientoImagenes = new AlmacenamientoImagenesFalso();
    container.reset();
    container.registerInstance<IRepositorioReportes>('IRepositorioReportes', repositorioReportes);
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', repositorioNotificaciones);
    container.registerInstance<IControlDeTasa>('IControlDeTasa', controlDeTasa);
    container.registerInstance<IControlDeTasaConReintento>('IControlDeTasaConReintento', controlDeTasaAntiSaturacion);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
    container.registerInstance<IAlmacenamientoImagenes>('IAlmacenamientoImagenes', almacenamientoImagenes);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001), sin persistir nada', async () => {
    autenticarComo(getUserMock, null);

    const respuesta = await POST(crearRequest(reporteValido));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza sin categoría/tipo (400 / PEA-REP-001), antes de invocar rate limit o Cloudinary', async () => {
    autenticarComo(getUserMock, 'usuario-1');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tipo: _tipo, ...sinTipo } = reporteValido;

    const respuesta = await POST(crearRequest(sinTipo));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-001');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza sin foto (400 / PEA-REP-002)', async () => {
    autenticarComo(getUserMock, 'usuario-1');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fotoUrl: _fotoUrl, ...sinFoto } = reporteValido;

    const respuesta = await POST(crearRequest(sinFoto));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-002');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  // Paso 4 del checklist + AC explícito: una fotoUrl que pertenece a nuestra
  // cuenta de Cloudinary pero NO fue subida por el usuario autenticado
  // (ej. reutilizar la foto de un reporte ajeno) corta la cadena ANTES del
  // INSERT en `reportes`.
  it('rechaza una fotoUrl que no corresponde a una subida del usuario autenticado (400 / PEA-REP-002)', async () => {
    autenticarComo(getUserMock, 'usuario-1');
    almacenamientoImagenes.subidaPorElUsuario = false;

    const respuesta = await POST(crearRequest(reporteValido));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-002');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza una ubicación inválida (400 / PEA-REP-003)', async () => {
    autenticarComo(getUserMock, 'usuario-1');

    const respuesta = await POST(crearRequest({ ...reporteValido, latitud: 0, longitud: 0 }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-003');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza cuando se superó el límite de reportes (429 / PEA-REP-004)', async () => {
    autenticarComo(getUserMock, 'usuario-1');
    controlDeTasa.permitido = false;

    const respuesta = await POST(crearRequest(reporteValido));

    expect(respuesta.status).toBe(429);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-004');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  describe('ConRateLimitDecorator — límite anti-saturación (5/hora, usuarios no verificados)', () => {
    // Paso 4 del checklist: agota el límite y verifica el rechazo del sexto intento en la misma hora.
    it('permite los primeros 5 reportes en la hora y rechaza el sexto con 429 / PEA-REP-004 + Retry-After', async () => {
      autenticarComo(getUserMock, 'usuario-no-verificado');
      repositorioPerfil.estadoVerificacion = 'no_requerido';
      controlDeTasaAntiSaturacion.reintentarEnSegundos = 1800;

      for (let intento = 1; intento <= 5; intento += 1) {
        const respuesta = await POST(crearRequest(reporteValido));
        expect(respuesta.status).toBe(201);
      }

      const sextoIntento = await POST(crearRequest(reporteValido));

      expect(sextoIntento.status).toBe(429);
      const cuerpo = await sextoIntento.json();
      expect(cuerpo.codigo).toBe('PEA-REP-004');
      expect(sextoIntento.headers.get('Retry-After')).toBe('1800');
      expect(repositorioReportes.creados).toHaveLength(5);
    });

    it('un usuario verificado no queda sujeto a este límite (o se documenta explícitamente si lo estuviera): el sexto intento igual se acepta', async () => {
      autenticarComo(getUserMock, 'usuario-verificado');
      repositorioPerfil.estadoVerificacion = 'verificado';

      for (let intento = 1; intento <= 6; intento += 1) {
        const respuesta = await POST(crearRequest(reporteValido));
        expect(respuesta.status).toBe(201);
      }

      expect(repositorioReportes.creados).toHaveLength(6);
    });
  });

  it('publica el reporte "perdido" con éxito, con estado inicial "reportado", y no dispara la búsqueda de coincidencias', async () => {
    autenticarComo(getUserMock, 'usuario-1');

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
    autenticarComo(getUserMock, 'vecino-1');

    const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'encontrado', especie: 'perro' }));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.tipo).toBe('encontrado');
    expect(cuerpo.mascotaId).toBeNull();
    expect(repositorioReportes.creados[0]).toMatchObject({ tipo: 'encontrado', mascotaId: null, especie: 'perro' });
  });

  it('un reporte "encontrado" dispara la búsqueda de coincidencias zona/especie contra reportes "perdido" activos', async () => {
    autenticarComo(getUserMock, 'vecino-1');

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
    autenticarComo(getUserMock, 'vecino-1');
    repositorioReportes.coincidenciasARetornar = [{ id: 'perdido-1', reportadoPor: 'dueno-1' }];

    const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'encontrado', especie: 'perro' }));
    const cuerpo = await respuesta.json();

    expect(repositorioNotificaciones.creadas).toEqual([
      { usuarioId: 'dueno-1', tipo: 'reporte_coincidente', referenciaTabla: 'reportes', referenciaId: cuerpo.id },
    ]);
  });

  it('sin especie declarada, un reporte "encontrado" igual se publica pero no dispara la búsqueda de coincidencias', async () => {
    autenticarComo(getUserMock, 'vecino-1');

    const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'encontrado' }));

    expect(respuesta.status).toBe(201);
    expect(repositorioReportes.llamadasBusquedaCoincidencias).toHaveLength(0);
  });
});
