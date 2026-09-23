/**
 * @jest-environment node
 *
 * GET /api/geocoding/reverse — geocodificación inversa consumida por el
 * paso 3 del wizard de reporte. Siempre autenticada (no hay caso de uso
 * anónimo), con rate limit propio por usuario.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IServicioGeocodificacion } from '@dominio/puertos/IServicioGeocodificacion';
import type { IControlDeTasaConReintento } from '@dominio/puertos/IControlDeTasaConReintento';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { GET } from '@app/api/geocoding/reverse/route';

function autenticarComo(usuarioId: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: usuarioId } }, error: null });
}

function crearRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/geocoding/reverse${query}`, { method: 'GET' });
}

class ServicioGeocodificacionFalso implements IServicioGeocodificacion {
  constructor(
    private readonly resultado: Awaited<ReturnType<IServicioGeocodificacion['revGeocodificar']>>,
  ) {}

  async revGeocodificar() {
    return this.resultado;
  }
}

class ControlDeTasaFalso implements IControlDeTasaConReintento {
  constructor(
    private readonly permitido: boolean,
    private readonly reintentarEnSegundos = 0,
  ) {}

  async evaluar() {
    return { permitido: this.permitido, reintentarEnSegundos: this.reintentarEnSegundos };
  }
}

describe('GET /api/geocoding/reverse', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    container.reset();
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'sin sesión' } });

    const respuesta = await GET(crearRequest('?lat=-37.9989&lon=-61.3565'));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('rechaza coordenadas inválidas', async () => {
    autenticarComo('usuario-1');
    container.registerInstance<IControlDeTasaConReintento>(
      'IControlDeTasaGeocoding',
      new ControlDeTasaFalso(true),
    );

    const respuesta = await GET(crearRequest('?lat=abc&lon=xyz'));

    expect(respuesta.status).toBe(400);
  });

  it('rechaza con 429 y header Retry-After cuando se excede el límite de consultas', async () => {
    autenticarComo('usuario-1');
    container.registerInstance<IControlDeTasaConReintento>(
      'IControlDeTasaGeocoding',
      new ControlDeTasaFalso(false, 37),
    );

    const respuesta = await GET(crearRequest('?lat=-37.9989&lon=-61.3565'));

    expect(respuesta.status).toBe(429);
    expect(respuesta.headers.get('Retry-After')).toBe('37');
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-006');
  });

  it('devuelve la dirección aproximada para un usuario autenticado dentro del límite', async () => {
    autenticarComo('usuario-1');
    container.registerInstance<IControlDeTasaConReintento>(
      'IControlDeTasaGeocoding',
      new ControlDeTasaFalso(true),
    );
    container.registerInstance<IServicioGeocodificacion>(
      'IServicioGeocodificacion',
      new ServicioGeocodificacionFalso({
        direccionCorta: 'Av. San Martín 123, Coronel Pringles',
        provincia: 'Buenos Aires',
        pais: 'Argentina',
      }),
    );

    const respuesta = await GET(crearRequest('?lat=-37.9989&lon=-61.3565'));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({
      direccionCorta: 'Av. San Martín 123, Coronel Pringles',
      provincia: 'Buenos Aires',
      pais: 'Argentina',
    });
  });

  it('devuelve null cuando no hay dirección para esas coordenadas', async () => {
    autenticarComo('usuario-1');
    container.registerInstance<IControlDeTasaConReintento>(
      'IControlDeTasaGeocoding',
      new ControlDeTasaFalso(true),
    );
    container.registerInstance<IServicioGeocodificacion>(
      'IServicioGeocodificacion',
      new ServicioGeocodificacionFalso(null),
    );

    const respuesta = await GET(crearRequest('?lat=0&lon=0'));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toBeNull();
  });
});
