/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { CriteriosBusquedaSemantica, IRepositorioReportes, ReporteSimilar } from '@dominio/puertos/IRepositorioReportes';
import type { IGeneradorEmbeddings } from '@dominio/puertos/IGeneradorEmbeddings';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { ServicioExternoNoDisponibleError } from '@dominio/errores/erroresTransversales';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que
// tests/integration/red-colaboracion.directorio.listar.test.ts.
import { GET } from '@app/api/red-colaboracion/reportes/similares/route';

const vectorDeEjemplo = Array.from({ length: 1536 }, () => 0.001);

const reporteDeEjemplo: ReporteSimilar = {
  id: 'reporte-1',
  tipo: 'perdido',
  subtipo: null,
  descripcion: 'Gato asustadizo con otros perros',
  fotoUrl: 'https://res.cloudinary.com/demo/image/upload/gato.jpg',
  latitud: -37.9989,
  longitud: -61.3565,
  especie: 'gato',
  estado: 'reportado',
  createdAt: new Date('2026-09-10T09:00:00.000Z'),
  similitud: 0.87,
};

class RepositorioReportesFalso implements IRepositorioReportes {
  public ultimosCriterios: CriteriosBusquedaSemantica | null = null;

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async buscarPerdidosActivosPorZonaYEspecie(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async listar(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async obtenerEstadoActual(): Promise<string | null> {
    throw new Error('no usado en este test');
  }

  async actualizarEstado(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async obtenerPropietario(): Promise<string | null> {
    throw new Error('no usado en este test');
  }

  async listarHistorialEstado(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async buscarPorSimilitudSemantica(criterios: CriteriosBusquedaSemantica): Promise<ReporteSimilar[]> {
    this.ultimosCriterios = criterios;
    return [reporteDeEjemplo];
  }
}

class GeneradorEmbeddingsFalso implements IGeneradorEmbeddings {
  public fallar = false;

  async generarEmbedding(): Promise<number[]> {
    if (this.fallar) throw new ServicioExternoNoDisponibleError();
    return vectorDeEjemplo;
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'organizacion';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'solicitante@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: null };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(query: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/red-colaboracion/reportes/similares');
  Object.entries(query).forEach(([clave, valor]) => url.searchParams.set(clave, valor));
  return new NextRequest(url);
}

describe('GET /api/red-colaboracion/reportes/similares (Búsqueda híbrida pgvector)', () => {
  let repositorioReportes: RepositorioReportesFalso;
  let generadorEmbeddings: GeneradorEmbeddingsFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioReportes = new RepositorioReportesFalso();
    generadorEmbeddings = new GeneradorEmbeddingsFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioReportes>('IRepositorioReportes', repositorioReportes);
    container.registerInstance<IGeneradorEmbeddings>('IGeneradorEmbeddings', generadorEmbeddings);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await GET(crearRequest({ consulta: 'gato asustadizo' }));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it.each(['dueño', 'comerciante'])('rechaza con 403 / PEA-SIS-002 para un usuario con rol %s', async (rol) => {
    autenticarComo('usuario-1');
    repositorioPerfil.rol = rol;

    const respuesta = await GET(crearRequest({ consulta: 'gato asustadizo' }));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it.each(['organizacion', 'veterinario', 'rescatista', 'municipio', 'administrador'])(
    'permite el acceso (200) a un usuario con rol %s',
    async (rol) => {
      autenticarComo('usuario-1');
      repositorioPerfil.rol = rol;

      const respuesta = await GET(crearRequest({ consulta: 'gato asustadizo' }));

      expect(respuesta.status).toBe(200);
    },
  );

  it('devuelve los reportes ordenados por similitud que arma el repositorio', async () => {
    autenticarComo('ong-1');

    const respuesta = await GET(crearRequest({ consulta: 'gato asustadizo con otros perros' }));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toHaveLength(1);
    expect(cuerpo[0].id).toBe('reporte-1');
    expect(repositorioReportes.ultimosCriterios?.vectorConsulta).toEqual(vectorDeEjemplo);
    expect(repositorioReportes.ultimosCriterios?.limite).toBe(20);
  });

  it('propaga los filtros exactos de la query al caso de uso', async () => {
    autenticarComo('ong-1');

    await GET(crearRequest({ consulta: 'foco sanitario', tipo: 'problematica', estado: 'en_revision', especie: 'perro' }));

    expect(repositorioReportes.ultimosCriterios?.tipo).toBe('problematica');
    expect(repositorioReportes.ultimosCriterios?.estado).toBe('en_revision');
    expect(repositorioReportes.ultimosCriterios?.especie).toBe('perro');
  });

  it('rechaza una consulta demasiado corta (400 / PEA-SIS-005)', async () => {
    autenticarComo('ong-1');

    const respuesta = await GET(crearRequest({ consulta: 'ga' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });

  it('rechaza un filtro de zona incompleto (400 / PEA-SIS-005)', async () => {
    autenticarComo('ong-1');

    const respuesta = await GET(crearRequest({ consulta: 'gato asustadizo', latitud: '-37.9989' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });

  it('devuelve 503 / PEA-SIS-004 si el proveedor de embeddings no responde', async () => {
    autenticarComo('ong-1');
    generadorEmbeddings.fallar = true;

    const respuesta = await GET(crearRequest({ consulta: 'gato asustadizo' }));

    expect(respuesta.status).toBe(503);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-004');
  });
});
