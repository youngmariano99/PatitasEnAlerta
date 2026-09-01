/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  FiltrosListadoReportes,
  IRepositorioReportes,
  PaginaReportes,
  ReporteListado,
} from '@dominio/puertos/IRepositorioReportes';

// GET /api/reportes es público — a diferencia de reportes.crear.test.ts, acá
// no hace falta mockear '@supabase/ssr' (el route handler ni siquiera
// resuelve la sesión para este método, ver middleware.expiracionSesion.test.ts).
import { GET } from '@app/api/reportes/route';

class RepositorioReportesFalso implements IRepositorioReportes {
  public llamadas: { filtros: FiltrosListadoReportes; pagina: number; porPagina: number }[] = [];
  public paginaARetornar: PaginaReportes = { items: [], total: 0, pagina: 1, porPagina: 50 };

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async buscarPerdidosActivosPorZonaYEspecie(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async listar(filtros: FiltrosListadoReportes, pagina: number, porPagina: number): Promise<PaginaReportes> {
    this.llamadas.push({ filtros, pagina, porPagina });
    return this.paginaARetornar;
  }
}

function crearRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/reportes${query}`, { method: 'GET' });
}

function crearReporteListado(overrides: Partial<ReporteListado> = {}): ReporteListado {
  return {
    id: 'reporte-1',
    tipo: 'perdido',
    subtipo: null,
    descripcion: 'Se perdió cerca de la plaza.',
    fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg',
    latitud: -37.9989,
    longitud: -61.3565,
    especie: 'perro',
    estado: 'reportado',
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('GET /api/reportes (Listado y mapa de reportes activos, ListarReportes)', () => {
  let repositorioReportes: RepositorioReportesFalso;

  beforeEach(() => {
    repositorioReportes = new RepositorioReportesFalso();
    container.reset();
    container.registerInstance<IRepositorioReportes>('IRepositorioReportes', repositorioReportes);
  });

  it('responde 200 sin sesión (usuario anon) — confirma el GRANT SELECT a anon', async () => {
    const respuesta = await GET(crearRequest(''));

    expect(respuesta.status).toBe(200);
  });

  it('sin `pagina`/`porPagina`, pide la primera página con el tope de 50', async () => {
    await GET(crearRequest(''));

    expect(repositorioReportes.llamadas).toEqual([{ filtros: { tipo: undefined, estado: undefined, zona: undefined }, pagina: 1, porPagina: 50 }]);
  });

  it('nunca deja pedir más de 50 por página aunque el cliente lo solicite', async () => {
    await GET(crearRequest('?porPagina=500'));

    expect(repositorioReportes.llamadas[0]?.porPagina).toBe(50);
  });

  it('combina simultáneamente los filtros de tipo, estado y zona', async () => {
    await GET(crearRequest('?tipo=perdido&estado=en_atencion&latitud=-37.9989&longitud=-61.3565&radioKm=5'));

    expect(repositorioReportes.llamadas).toEqual([
      {
        filtros: { tipo: 'perdido', estado: 'en_atencion', zona: { latitud: -37.9989, longitud: -61.3565, radioKm: 5 } },
        pagina: 1,
        porPagina: 50,
      },
    ]);
  });

  it('rechaza un filtro de zona incompleto (400 / PEA-SIS-005)', async () => {
    const respuesta = await GET(crearRequest('?latitud=-37.9989&longitud=-61.3565'));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
    expect(repositorioReportes.llamadas).toHaveLength(0);
  });

  it('ignora un tipo/estado fuera de catálogo en vez de rechazar la request', async () => {
    const respuesta = await GET(crearRequest('?tipo=urgencia_vial&estado=en_llamas'));

    expect(respuesta.status).toBe(200);
    expect(repositorioReportes.llamadas[0]?.filtros).toEqual({ tipo: undefined, estado: undefined, zona: undefined });
  });

  it('devuelve los items, total y metadatos de paginación tal como los entrega el caso de uso', async () => {
    repositorioReportes.paginaARetornar = {
      items: [crearReporteListado()],
      total: 1,
      pagina: 1,
      porPagina: 50,
    };

    const respuesta = await GET(crearRequest(''));

    const cuerpo = await respuesta.json();
    expect(cuerpo.total).toBe(1);
    expect(cuerpo.items).toHaveLength(1);
    expect(cuerpo.items[0].id).toBe('reporte-1');
    expect(cuerpo.items[0]).not.toHaveProperty('reportadoPor');
  });

  it('given más de 50 reportes activos, retorna únicamente la página solicitada (≤50 registros)', async () => {
    repositorioReportes.paginaARetornar = {
      items: Array.from({ length: 50 }, (_, indice) => crearReporteListado({ id: `reporte-${indice}` })),
      total: 220,
      pagina: 1,
      porPagina: 50,
    };

    const respuesta = await GET(crearRequest(''));

    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(50);
    expect(cuerpo.total).toBe(220);
  });
});
