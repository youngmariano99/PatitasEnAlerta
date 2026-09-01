/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { FiltrosListadoEventos, IRepositorioEventos, PaginaEventos } from '@dominio/puertos/IRepositorioEventos';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/municipio.eventos.crear.test.ts). No hace
// falta invocar getUserMock en ningún test de este archivo — GET
// /api/municipio/eventos es público y ListarEventosPublico.autorizar() ni
// siquiera consulta la sesión.
import { GET } from '@app/api/municipio/eventos/route';

/** Simula, en memoria, la tabla `eventos` — filtra/pagina en O(n), igual que RepositorioReportesEnMemoria en tests/integration/reportes.listar.test.ts. */
class RepositorioEventosEnMemoria implements IRepositorioEventos {
  public eventos: PaginaEventos['items'] = [];

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listar(filtros: FiltrosListadoEventos, pagina: number, porPagina: number): Promise<PaginaEventos> {
    const filtrados = this.eventos
      .filter((e) => !filtros.tipo || e.tipo === filtros.tipo)
      .filter((e) => !filtros.fechaDesde || e.fecha >= filtros.fechaDesde)
      .filter((e) => !filtros.fechaHasta || e.fecha <= filtros.fechaHasta)
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    const inicio = (pagina - 1) * porPagina;
    return { items: filtrados.slice(inicio, inicio + porPagina), total: filtrados.length, pagina, porPagina };
  }
}

function crearRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/municipio/eventos${query}`, { method: 'GET' });
}

/** Genera N eventos futuros distribuidos en TIPOS_EVENTO_SOPORTADOS — simula volumen alto para probar paginación (AC #2). */
function generarEventos(cantidad: number): PaginaEventos['items'] {
  const tipos = ['castracion', 'vacunacion', 'desparasitacion', 'otro'];
  return Array.from({ length: cantidad }, (_, indice) => ({
    id: `evento-${indice + 1}`,
    municipioId: 'municipio-1',
    titulo: `Jornada #${indice + 1}`,
    tipo: tipos[indice % tipos.length]!,
    direccion: `Calle ${indice} N° 100`,
    latitud: -37.9989 + (indice % 10) * 0.01,
    longitud: -61.3565 + (indice % 10) * 0.01,
    fecha: new Date(2026, 8, 1 + indice),
    cuposTotales: 20 + (indice % 30),
    requisitos: null,
  }));
}

describe('GET /api/municipio/eventos (Calendario público de operativos — acceso anónimo)', () => {
  let repositorioEventos: RepositorioEventosEnMemoria;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioEventos = new RepositorioEventosEnMemoria();
    container.reset();
    container.registerInstance<IRepositorioEventos>('IRepositorioEventos', repositorioEventos);
  });

  it('AC: un usuario no autenticado recibe 200 con los eventos activos, sin necesidad de token', async () => {
    repositorioEventos.eventos = generarEventos(3);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    expect(getUserMock).not.toHaveBeenCalled();
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(3);
  });

  it('Verificación técnica: GRANT SELECT ON eventos TO anon — el endpoint nunca intenta resolver el usuario autenticado', async () => {
    repositorioEventos.eventos = generarEventos(1);

    await GET(crearRequest());

    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('AC: con más de 50 eventos activos, se aplica paginación server-side (tope 50 por página)', async () => {
    repositorioEventos.eventos = generarEventos(75);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(50);
    expect(cuerpo.total).toBe(75);
    expect(cuerpo.pagina).toBe(1);
    expect(cuerpo.porPagina).toBe(50);
  });

  it('respeta un porPagina explícito bajo el tope de 50', async () => {
    repositorioEventos.eventos = generarEventos(75);

    const respuesta = await GET(crearRequest('?pagina=2&porPagina=20'));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(20);
    expect(cuerpo.pagina).toBe(2);
  });

  it('ignora un porPagina por encima de 50 y aplica el tope (defensa en profundidad)', async () => {
    repositorioEventos.eventos = generarEventos(75);

    const respuesta = await GET(crearRequest('?porPagina=200'));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.porPagina).toBe(50);
    expect(cuerpo.items).toHaveLength(50);
  });

  it('filtra por tipo cuando se declara', async () => {
    repositorioEventos.eventos = generarEventos(8);

    const respuesta = await GET(crearRequest('?tipo=vacunacion'));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items.every((e: { tipo: string }) => e.tipo === 'vacunacion')).toBe(true);
  });

  it('rechaza un rango de fechas invertido con 400 / PEA-SIS-005', async () => {
    const respuesta = await GET(crearRequest('?fechaDesde=2026-09-30T00:00:00.000Z&fechaHasta=2026-09-01T00:00:00.000Z'));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });

  it('devuelve los eventos ordenados por fecha ascendente', async () => {
    repositorioEventos.eventos = [...generarEventos(3)].reverse();

    const respuesta = await GET(crearRequest());
    const cuerpo = await respuesta.json();

    const fechas = cuerpo.items.map((e: { fecha: string }) => new Date(e.fecha).getTime());
    expect(fechas).toEqual([...fechas].sort((a, b) => a - b));
  });
});
