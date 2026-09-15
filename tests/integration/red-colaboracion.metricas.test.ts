/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Endpoint de métricas propias sin comparación pública"
 * (Módulo 5): confirma que el endpoint nunca retorna filas ni agregados de
 * un stakeholder distinto al usuario autenticado. El fake reproduce el
 * mismo filtro que PrismaColaboracionesRepositorio.obtenerMetricasPropias
 * (WHERE stakeholder_id = ... AND estado = 'completada') sobre un dataset
 * con colaboraciones de VARIOS stakeholders, para probar el aislamiento de
 * punta a punta (route handler → caso de uso → repositorio), no solo que el
 * mock devuelva lo que se le pida.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioColaboraciones, MetricasColaboracionPropias } from '@dominio/puertos/IRepositorioColaboraciones';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { GET } from '@app/api/red-colaboracion/metricas/route';

const STAKEHOLDER_A = '33333333-3333-3333-3333-333333333333';
const STAKEHOLDER_B = '44444444-4444-4444-4444-444444444444';

interface FilaColaboracionFake {
  stakeholderId: string;
  estado: string;
  tipo: string;
}

const DATASET: FilaColaboracionFake[] = [
  { stakeholderId: STAKEHOLDER_A, estado: 'completada', tipo: 'transito' },
  { stakeholderId: STAKEHOLDER_A, estado: 'completada', tipo: 'transito' },
  { stakeholderId: STAKEHOLDER_A, estado: 'completada', tipo: 'insumos' },
  { stakeholderId: STAKEHOLDER_A, estado: 'propuesta', tipo: 'transito' }, // no cuenta: no está 'completada'
  { stakeholderId: STAKEHOLDER_B, estado: 'completada', tipo: 'adopcion' },
  { stakeholderId: STAKEHOLDER_B, estado: 'completada', tipo: 'adopcion' },
  { stakeholderId: STAKEHOLDER_B, estado: 'completada', tipo: 'asistencia_veterinaria' },
  { stakeholderId: STAKEHOLDER_B, estado: 'rechazada', tipo: 'adopcion' }, // no cuenta
];

class RepositorioColaboracionesFalso implements IRepositorioColaboraciones {
  async obtenerActual(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async actualizarEstado(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarHistorialEstado(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async existePropuestaDe(): Promise<boolean> {
    throw new Error('no usado en este test');
  }

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async obtenerMetricasPropias(stakeholderId: string): Promise<MetricasColaboracionPropias> {
    const propias = DATASET.filter((fila) => fila.stakeholderId === stakeholderId && fila.estado === 'completada');
    const porTipo: Record<string, number> = {};
    for (const fila of propias) {
      porTipo[fila.tipo] = (porTipo[fila.tipo] ?? 0) + 1;
    }
    return { totalCompletadas: propias.length, porTipo };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(): NextRequest {
  return new NextRequest('http://localhost/api/red-colaboracion/metricas');
}

describe('GET /api/red-colaboracion/metricas (Métricas personales de contribución)', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    container.reset();
    container.registerInstance<IRepositorioColaboraciones>('IRepositorioColaboraciones', new RepositorioColaboracionesFalso());
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('el stakeholder A recibe únicamente el agregado de SUS propias colaboraciones completadas (nunca las de B)', async () => {
    autenticarComo(STAKEHOLDER_A);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ totalCompletadas: 3, porTipo: { transito: 2, insumos: 1 } });
  });

  it('el stakeholder B recibe únicamente el agregado de SUS propias colaboraciones completadas (nunca las de A)', async () => {
    autenticarComo(STAKEHOLDER_B);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ totalCompletadas: 3, porTipo: { adopcion: 2, asistencia_veterinaria: 1 } });
  });

  it('verificación técnica: el total nunca incluye filas de otro stakeholder_id, incluso ante un dataset mixto', async () => {
    autenticarComo(STAKEHOLDER_A);
    const respuestaA = await GET(crearRequest());
    const cuerpoA = await respuestaA.json();

    autenticarComo(STAKEHOLDER_B);
    const respuestaB = await GET(crearRequest());
    const cuerpoB = await respuestaB.json();

    const totalRealDeA = DATASET.filter((f) => f.stakeholderId === STAKEHOLDER_A && f.estado === 'completada').length;
    const totalRealDeB = DATASET.filter((f) => f.stakeholderId === STAKEHOLDER_B && f.estado === 'completada').length;
    expect(cuerpoA.totalCompletadas).toBe(totalRealDeA);
    expect(cuerpoB.totalCompletadas).toBe(totalRealDeB);
    expect(cuerpoA.totalCompletadas + cuerpoB.totalCompletadas).toBeLessThan(DATASET.length);
  });

  it('un usuario sin ninguna colaboración propia recibe el agregado vacío, no un error ni datos ajenos', async () => {
    autenticarComo('55555555-5555-5555-5555-555555555555');

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ totalCompletadas: 0, porTipo: {} });
  });

  it('el payload nunca incluye rankings, promedios ni ningún campo comparativo entre usuarios', async () => {
    autenticarComo(STAKEHOLDER_A);

    const respuesta = await GET(crearRequest());
    const cuerpo = await respuesta.json();

    expect(Object.keys(cuerpo).sort()).toEqual(['porTipo', 'totalCompletadas']);
    const textoCrudo = JSON.stringify(cuerpo);
    expect(textoCrudo).not.toMatch(/ranking|promedio|posicion|comparaci/i);
    expect(textoCrudo).not.toContain(STAKEHOLDER_B);
  });
});
