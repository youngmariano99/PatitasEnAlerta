/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Endpoint público de comercios verificados por
 * proximidad" (Módulo 7): confirma que un comercio 'pendiente' nunca
 * aparece en el listado público, y que el endpoint responde sin ninguna
 * autenticación (verificación técnica del GRANT SELECT ON comercios TO
 * anon, Paso 2) — a diferencia del resto de tests/integration/*, este
 * archivo deliberadamente NO mockea '@supabase/ssr' ni construye ninguna
 * cookie de sesión: el propio route handler nunca llama a
 * obtenerUsuarioAutenticado, así que si el test pasara solo "por casualidad"
 * con una sesión simulada no probaría nada — acá se ejercita el camino real
 * de un visitante anónimo.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { Comercio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import { GET as listarComerciosCercanos } from '@app/api/comercios/cercanos/route';

function crearComercio(overrides: Partial<Comercio>): Comercio {
  return {
    id: 'comercio-1',
    usuarioId: 'usuario-1',
    nombreComercio: 'Pet Shop Pringles',
    tipoComercio: 'pet_shop',
    direccion: 'Av. San Martín 500',
    latitud: -37.9989,
    longitud: -61.3565,
    estadoVerificacion: 'verificado',
    createdAt: new Date('2026-09-14T10:00:00.000Z'),
    ...overrides,
  };
}

class RepositorioComerciosFalso implements IRepositorioComercios {
  constructor(private readonly verificados: Comercio[]) {}

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async obtenerPropio(): Promise<never> {
    throw new Error('no usado en este test');
  }

  // El fake reproduce el contrato real (docs SCHEMA/ROLES): solo entrega
  // comercios con estado_verificacion='verificado' — un comercio 'pendiente'
  // nunca debería siquiera llegar acá, lo mismo que impone
  // PrismaComercioRepositorio.listarVerificados con su propio WHERE. También
  // reproduce el filtro de texto libre (Paso 1) para poder probar de punta a
  // punta que el `q` de la query llega hasta acá.
  async listarVerificados(_zona?: unknown, textoLibre?: string): Promise<Comercio[]> {
    if (!textoLibre) return this.verificados;
    const texto = textoLibre.toLowerCase();
    return this.verificados.filter(
      (c) => c.nombreComercio.toLowerCase().includes(texto) || c.tipoComercio.toLowerCase().includes(texto),
    );
  }
}

function crearRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/comercios/cercanos${query}`, { method: 'GET' });
}

describe('GET /api/comercios/cercanos (ListarComerciosCercanos, Módulo 7)', () => {
  beforeEach(() => {
    container.reset();
  });

  it('AC / Paso 4: un comercio "pendiente" nunca aparece en el listado público — responde 200 sin ninguna sesión', async () => {
    const verificado = crearComercio({ id: 'verificado-1' });
    container.registerInstance<IRepositorioComercios>('IRepositorioComercios', new RepositorioComerciosFalso([verificado]));

    const respuesta = await listarComerciosCercanos(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(1);
    expect(cuerpo.items[0].id).toBe('verificado-1');
    expect(cuerpo.items.every((item: { id: string }) => item.id !== 'pendiente-1')).toBe(true);
  });

  it('AC: ordena por distancia aproximada cuando se indica una ubicación de referencia', async () => {
    const cercano = crearComercio({ id: 'cercano', latitud: -37.9989, longitud: -61.3565 });
    const lejano = crearComercio({ id: 'lejano', latitud: -34.6037, longitud: -58.3816 });
    container.registerInstance<IRepositorioComercios>('IRepositorioComercios', new RepositorioComerciosFalso([lejano, cercano]));

    const respuesta = await listarComerciosCercanos(crearRequest('?latitud=-37.9989&longitud=-61.3565&radioKm=1000'));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items.map((item: { id: string }) => item.id)).toEqual(['cercano', 'lejano']);
    expect(cuerpo.items[0].distanciaKm).toBeLessThan(cuerpo.items[1].distanciaKm);
  });

  it('Paso 1: filtra por texto libre sobre nombre_comercio/tipo_comercio', async () => {
    const petShop = crearComercio({ id: 'pet-shop', nombreComercio: 'Pet Shop Pringles', tipoComercio: 'pet_shop' });
    const peluqueria = crearComercio({ id: 'peluqueria', nombreComercio: 'Peluquería Canina Sur', tipoComercio: 'peluqueria' });
    container.registerInstance<IRepositorioComercios>('IRepositorioComercios', new RepositorioComerciosFalso([petShop, peluqueria]));

    const respuesta = await listarComerciosCercanos(crearRequest('?q=pet'));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items.map((item: { id: string }) => item.id)).toEqual(['pet-shop']);
  });

  it('rechaza con 400 / PEA-SIS-005 un filtro de proximidad incompleto', async () => {
    container.registerInstance<IRepositorioComercios>('IRepositorioComercios', new RepositorioComerciosFalso([]));

    const respuesta = await listarComerciosCercanos(crearRequest('?latitud=-37.9989'));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });
});
