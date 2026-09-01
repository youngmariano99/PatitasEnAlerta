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

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, así que el orden de imports acá abajo no afecta el
// mockeo real (mismo criterio que el resto de tests/integration/*.ts).
import { GET } from '@app/api/municipio/dashboard/route';

/**
 * Simula, en memoria, un dataset YA agregado de gran volumen (miles de filas
 * de vistas materializadas) — filtra en O(n) sobre ese arreglo, exactamente
 * el mismo trabajo que Postgres haría con un índice sobre `periodo`, nunca
 * un JOIN/COUNT costoso contra `reportes`/`turnos` en vivo (AC #1).
 */
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
  return new NextRequest(`http://localhost/api/municipio/dashboard${query}`, { method: 'GET' });
}

/** Genera N filas ya agregadas, distribuidas en TIPOS_REPORTE_SOPORTADOS × 60 semanas — simula "carga alta de datos históricos" (AC #2). */
function generarMetricasReportes(cantidad: number): MetricaReportePeriodo[] {
  const tipos = ['perdido', 'encontrado', 'problematica'];
  return Array.from({ length: cantidad }, (_, indice) => ({
    periodo: new Date(2025, 0, 1 + (indice % 60) * 7),
    tipo: tipos[indice % tipos.length]!,
    estado: 'reportado',
    zonaLat: -37.99 + (indice % 10) * 0.01,
    zonaLng: -61.35 + (indice % 10) * 0.01,
    total: 1 + (indice % 20),
  }));
}

describe('GET /api/municipio/dashboard (Dashboard analítico con mapas de calor)', () => {
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

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
  });

  it.each(['dueño', 'veterinario'])('rechaza con 403 / PEA-MUN-005 para un usuario con rol %s', async (rol) => {
    autenticarComo('usuario-1');
    repositorioPerfil.rol = rol;

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-005');
  });

  it('devuelve las métricas agregadas filtradas por tipo y período', async () => {
    autenticarComo('municipio-1');
    repositorioDashboard.metricasReportes = generarMetricasReportes(50);

    const respuesta = await GET(crearRequest('?tipoReporte=perdido'));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.metricasReportes.every((m: { tipo: string }) => m.tipo === 'perdido')).toBe(true);
  });

  it('rechaza un filtro de zona incompleto (400)', async () => {
    autenticarComo('municipio-1');

    const respuesta = await GET(crearRequest('?latitud=-37.9989'));

    expect(respuesta.status).toBe(400);
  });

  // Paso 4 del checklist: test de rendimiento — p95 acorde al NFR
  // (docs/PLANIFICACION.md: "p95 < 400ms en lecturas paginadas") consultando
  // SOLO las vistas materializadas, sin depender del volumen histórico
  // acumulado.
  describe('rendimiento (NFR p95 < 400ms, docs/PLANIFICACION.md) con carga histórica alta', () => {
    const NFR_P95_MS = 400;
    const CANTIDAD_MUESTRAS = 30;

    beforeEach(() => {
      autenticarComo('municipio-1');
      // "Carga alta de datos históricos" (AC #2): miles de filas ya
      // agregadas — el volumen real de `reportes`/`turnos` transaccionales
      // podría ser mucho mayor sin que esto creciera, porque la vista
      // materializada ya llegó pre-agregada.
      repositorioDashboard.metricasReportes = generarMetricasReportes(5000);
      repositorioDashboard.metricasTurnos = Array.from({ length: 2000 }, (_, i) => ({
        periodo: new Date(2025, 0, 1 + (i % 60) * 7),
        proveedorTipo: i % 2 === 0 ? 'municipio' : 'veterinario',
        estado: 'disponible',
        total: 1 + (i % 15),
      }));
    });

    it(`cumple p95 < ${NFR_P95_MS}ms en ${CANTIDAD_MUESTRAS} lecturas consecutivas`, async () => {
      const duraciones: number[] = [];

      for (let i = 0; i < CANTIDAD_MUESTRAS; i += 1) {
        const inicio = performance.now();
        const respuesta = await GET(crearRequest('?tipoReporte=perdido'));
        duraciones.push(performance.now() - inicio);
        expect(respuesta.status).toBe(200);
      }

      duraciones.sort((a, b) => a - b);
      const indiceP95 = Math.ceil(0.95 * duraciones.length) - 1;
      const p95 = duraciones[indiceP95]!;

      expect(p95).toBeLessThan(NFR_P95_MS);
    });

    it('el tiempo de respuesta no depende de si se filtra por zona (no hay escaneo adicional sobre `reportes` en vivo)', async () => {
      const inicioSinZona = performance.now();
      await GET(crearRequest('?tipoReporte=perdido'));
      const duracionSinZona = performance.now() - inicioSinZona;

      const inicioConZona = performance.now();
      await GET(crearRequest('?latitud=-37.9989&longitud=-61.3565&radioKm=5'));
      const duracionConZona = performance.now() - inicioConZona;

      expect(duracionSinZona).toBeLessThan(NFR_P95_MS);
      expect(duracionConZona).toBeLessThan(NFR_P95_MS);
    });
  });
});
