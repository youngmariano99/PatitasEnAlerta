/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioFichasAdopcion, PaginaFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';

// GET /api/adopciones es público (sin sesión ni RLS que verificar acá): no
// hace falta mockear '@supabase/ssr' — a diferencia de
// tests/integration/municipio.eventos.listarPublico.test.ts, esta ruta ni
// siquiera intenta resolver un usuario autenticado.
import { GET } from '@app/api/adopciones/route';

/** Simula, en memoria, la tabla `vitrina_adopcion` — filtra/pagina en O(n), igual que otros fakes de integración de este módulo. */
class RepositorioFichasEnMemoria implements IRepositorioFichasAdopcion {
  public fichas: FichaAdopcion[] = [];

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async buscarPorId(): Promise<null> {
    return null;
  }

  async actualizar(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async darDeBaja(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarPorMunicipio(): Promise<PaginaFichasAdopcion> {
    return { items: [], total: 0, pagina: 1, porPagina: 50 };
  }

  async listarPublico(pagina: number, porPagina: number): Promise<PaginaFichasAdopcion> {
    const disponibles = this.fichas.filter((f) => f.estado === 'disponible');
    const inicio = (pagina - 1) * porPagina;
    return { items: disponibles.slice(inicio, inicio + porPagina), total: disponibles.length, pagina, porPagina };
  }
}

function crearRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/adopciones${query}`, { method: 'GET' });
}

function crearFicha(id: string, estado: string): FichaAdopcion {
  return FichaAdopcion.reconstruir(
    id,
    {
      municipioId: 'municipio-1',
      nombreAnimal: `Animal ${id}`,
      especie: 'perro',
      edadAproximada: 3,
      tamano: 'mediano',
      temperamento: 'Sociable',
      estadoSalud: 'Sano',
      requisitosAdopcion: null,
      fotoUrl: `https://res.cloudinary.com/patitas-en-alerta/adopcion/${id}.jpg`,
      estado,
    },
    new Date('2026-08-01T12:00:00.000Z'),
  );
}

/** Genera N fichas 'disponible' para probar paginación (AC: volumen > 50). */
function generarFichasDisponibles(cantidad: number): FichaAdopcion[] {
  return Array.from({ length: cantidad }, (_, indice) => crearFicha(`ficha-${indice + 1}`, 'disponible'));
}

describe('GET /api/adopciones (Consulta pública de la vitrina de adopción — acceso anónimo)', () => {
  let repositorioFichas: RepositorioFichasEnMemoria;

  beforeEach(() => {
    repositorioFichas = new RepositorioFichasEnMemoria();
    container.reset();
    container.registerInstance<IRepositorioFichasAdopcion>('IRepositorioFichasAdopcion', repositorioFichas);
  });

  it('AC: dado fichas en estado disponible, adoptado y baja, un usuario no autenticado solo ve las disponibles', async () => {
    repositorioFichas.fichas = [
      crearFicha('ficha-disponible', 'disponible'),
      crearFicha('ficha-adoptado', 'adoptado'),
      crearFicha('ficha-baja', 'baja'),
    ];

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(1);
    expect(cuerpo.items[0].id).toBe('ficha-disponible');
  });

  it('Paso 4 / verificación técnica: una ficha en estado "baja" nunca aparece en el listado público', async () => {
    repositorioFichas.fichas = [crearFicha('ficha-baja', 'baja')];

    const respuesta = await GET(crearRequest());

    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toEqual([]);
    expect(cuerpo.total).toBe(0);
  });

  it('una ficha en estado "adoptado" tampoco aparece en el listado público', async () => {
    repositorioFichas.fichas = [crearFicha('ficha-adoptada', 'adoptado')];

    const respuesta = await GET(crearRequest());

    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toEqual([]);
  });

  it('AC: con más de 50 fichas disponibles, se aplica paginación server-side (tope 50 por página)', async () => {
    repositorioFichas.fichas = generarFichasDisponibles(75);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(50);
    expect(cuerpo.total).toBe(75);
    expect(cuerpo.pagina).toBe(1);
    expect(cuerpo.porPagina).toBe(50);
  });

  it('ignora un porPagina por encima de 50 y aplica el tope (defensa en profundidad)', async () => {
    repositorioFichas.fichas = generarFichasDisponibles(75);

    const respuesta = await GET(crearRequest('?porPagina=200'));

    const cuerpo = await respuesta.json();
    expect(cuerpo.porPagina).toBe(50);
    expect(cuerpo.items).toHaveLength(50);
  });

  it('respeta un porPagina explícito bajo el tope de 50', async () => {
    repositorioFichas.fichas = generarFichasDisponibles(75);

    const respuesta = await GET(crearRequest('?pagina=2&porPagina=20'));

    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(20);
    expect(cuerpo.pagina).toBe(2);
  });

  it('AC: sin fichas disponibles, devuelve una página vacía (200, no un error)', async () => {
    repositorioFichas.fichas = [];

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toEqual([]);
    expect(cuerpo.total).toBe(0);
  });
});
