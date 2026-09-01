/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  FiltrosMetricasReportes,
  FiltrosMetricasTurnos,
  IRepositorioDashboardMunicipal,
  MetricaReportePeriodo,
  MetricaTurnoPeriodo,
} from '@dominio/puertos/IRepositorioDashboardMunicipal';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/municipio.dashboard.test.ts).
import { GET } from '@app/api/municipio/dashboard/exportar/route';

/** Simula, en memoria, las vistas materializadas ya agregadas (mismo repositorio en memoria que el dashboard de pantalla). */
class RepositorioDashboardEnMemoria implements IRepositorioDashboardMunicipal {
  public metricasReportes: MetricaReportePeriodo[] = [];
  public metricasTurnos: MetricaTurnoPeriodo[] = [];

  async obtenerMetricasReportes(filtros: FiltrosMetricasReportes): Promise<MetricaReportePeriodo[]> {
    return this.metricasReportes.filter((m) => {
      if (filtros.periodoDesde && m.periodo < filtros.periodoDesde) return false;
      if (filtros.periodoHasta && m.periodo > filtros.periodoHasta) return false;
      if (filtros.tipo && m.tipo !== filtros.tipo) return false;
      return true;
    });
  }

  async obtenerMetricasTurnos(filtros: FiltrosMetricasTurnos): Promise<MetricaTurnoPeriodo[]> {
    return this.metricasTurnos.filter((m) => {
      if (filtros.periodoDesde && m.periodo < filtros.periodoDesde) return false;
      if (filtros.periodoHasta && m.periodo > filtros.periodoHasta) return false;
      return true;
    });
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'municipio';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'municipio@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: null };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/municipio/dashboard/exportar${query}`, { method: 'GET' });
}

describe('GET /api/municipio/dashboard/exportar (Exportación de resumen de actividad — Visitor)', () => {
  let repositorioDashboard: RepositorioDashboardEnMemoria;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioDashboard = new RepositorioDashboardEnMemoria();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioDashboardMunicipal>('IRepositorioDashboardMunicipal', repositorioDashboard);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await GET(crearRequest('?periodoDesde=2026-08-01T00:00:00.000Z&periodoHasta=2026-08-31T00:00:00.000Z'));

    expect(respuesta.status).toBe(401);
  });

  it.each(['dueño', 'veterinario'])('rechaza con 403 / PEA-MUN-005 para un usuario con rol %s', async (rol) => {
    autenticarComo('usuario-1');
    repositorioPerfil.rol = rol;

    const respuesta = await GET(crearRequest('?periodoDesde=2026-08-01T00:00:00.000Z&periodoHasta=2026-08-31T00:00:00.000Z'));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-005');
  });

  it('AC: rechaza con 400 / PEA-MUN-007 cuando el fin del rango es anterior al inicio', async () => {
    autenticarComo('municipio-1');

    const respuesta = await GET(crearRequest('?periodoDesde=2026-08-31T00:00:00.000Z&periodoHasta=2026-08-01T00:00:00.000Z'));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-007');
  });

  it('rechaza con 400 / PEA-MUN-007 cuando falta alguna de las fechas', async () => {
    autenticarComo('municipio-1');

    const respuesta = await GET(crearRequest('?periodoDesde=2026-08-01T00:00:00.000Z'));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-007');
  });

  describe('con un rango de fechas válido', () => {
    beforeEach(() => {
      autenticarComo('municipio-1');
      repositorioDashboard.metricasReportes = [
        {
          periodo: new Date('2026-08-03T00:00:00.000Z'),
          tipo: 'perdido',
          estado: 'reportado',
          zonaLat: -37.99,
          zonaLng: -61.35,
          total: 5,
        },
        {
          // Fuera del rango solicitado — no debe aparecer ni en pantalla ni en el CSV.
          periodo: new Date('2026-01-01T00:00:00.000Z'),
          tipo: 'encontrado',
          estado: 'reportado',
          zonaLat: -37.9,
          zonaLng: -61.3,
          total: 99,
        },
      ];
      repositorioDashboard.metricasTurnos = [
        { periodo: new Date('2026-08-03T00:00:00.000Z'), proveedorTipo: 'municipio', estado: 'disponible', total: 8 },
      ];
    });

    it('AC: responde con Content-Disposition: attachment y nombre de archivo con la fecha de generación', async () => {
      const respuesta = await GET(crearRequest('?periodoDesde=2026-08-01T00:00:00.000Z&periodoHasta=2026-08-31T00:00:00.000Z'));

      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
      const disposicion = respuesta.headers.get('Content-Disposition');
      expect(disposicion).toContain('attachment');
      const hoy = new Date().toISOString().slice(0, 10);
      expect(disposicion).toContain(`resumen-actividad-municipal-${hoy}.csv`);
    });

    it('AC: el CSV exportado contiene exactamente los mismos datos agregados que la vista de pantalla (GET /dashboard) para ese rango', async () => {
      const { GET: GET_DASHBOARD } = await import('@app/api/municipio/dashboard/route');
      const query = '?periodoDesde=2026-08-01T00:00:00.000Z&periodoHasta=2026-08-31T00:00:00.000Z';

      const respuestaPantalla = await GET_DASHBOARD(
        new NextRequest(`http://localhost/api/municipio/dashboard${query}`, { method: 'GET' }),
      );
      const datosPantalla = await respuestaPantalla.json();

      const respuestaCsv = await GET(crearRequest(query));
      const csv = await respuestaCsv.text();

      expect(csv).not.toContain('encontrado'); // la fila fuera de rango no debe filtrarse
      for (const metrica of datosPantalla.metricasReportes) {
        expect(csv).toContain(`${metrica.tipo},${metrica.estado},${metrica.zonaLat},${metrica.zonaLng},${metrica.total}`);
      }
      for (const metrica of datosPantalla.metricasTurnos) {
        expect(csv).toContain(`${metrica.proveedorTipo},${metrica.estado},${metrica.total}`);
      }
    });
  });
});
