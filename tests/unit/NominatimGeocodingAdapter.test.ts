/**
 * @jest-environment node
 */
jest.mock('@upstash/redis', () => {
  const get = jest.fn();
  const set = jest.fn();
  const Redis = jest.fn().mockImplementation(() => ({ get, set }));
  return { Redis, __mockGet: get, __mockSet: set };
});

import { NominatimGeocodingAdapter } from '@infraestructura/adaptadores/NominatimGeocodingAdapter';
import { ServicioExternoNoDisponibleError } from '@dominio/errores/erroresTransversales';

const { __mockGet: mockGet, __mockSet: mockSet } = jest.requireMock('@upstash/redis') as {
  __mockGet: jest.Mock;
  __mockSet: jest.Mock;
};

const ENV_ORIGINAL = process.env;

describe('NominatimGeocodingAdapter', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    process.env = {
      ...ENV_ORIGINAL,
      UPSTASH_REDIS_REST_URL: 'https://redis.example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token-de-prueba',
    };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = ENV_ORIGINAL;
  });

  it('lanza si faltan las variables de entorno de Upstash', () => {
    process.env = {
      ...ENV_ORIGINAL,
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    };
    expect(() => new NominatimGeocodingAdapter()).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it('devuelve el resultado cacheado sin llamar a Nominatim', async () => {
    mockGet.mockResolvedValue({
      direccionCorta: 'Calle Falsa 123',
      provincia: 'Buenos Aires',
      pais: 'Argentina',
    });
    const adaptador = new NominatimGeocodingAdapter();

    const resultado = await adaptador.revGeocodificar(-37.9989, -61.3565);

    expect(resultado).toEqual({
      direccionCorta: 'Calle Falsa 123',
      provincia: 'Buenos Aires',
      pais: 'Argentina',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('consulta Nominatim con el User-Agent identificatorio cuando no hay caché', async () => {
    mockGet.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: 'Av. San Martín 123, Coronel Pringles',
        address: { state: 'Buenos Aires', country: 'Argentina' },
      }),
    });
    const adaptador = new NominatimGeocodingAdapter();

    const resultado = await adaptador.revGeocodificar(-37.9989, -61.3565);

    expect(resultado).toEqual({
      direccionCorta: 'Av. San Martín 123, Coronel Pringles',
      provincia: 'Buenos Aires',
      pais: 'Argentina',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('nominatim.openstreetmap.org/reverse'),
      expect.objectContaining({
        headers: {
          'User-Agent': 'PatitasEnAlerta/1.0 (https://github.com/youngmariano99/PatitasEnAlerta)',
        },
      }),
    );
    expect(mockSet).toHaveBeenCalledWith('geocoding:-37.999:-61.356', resultado, {
      ex: 60 * 60 * 24 * 7,
    });
  });

  it('retorna null cuando Nominatim no devuelve una dirección para esas coordenadas (no es un error)', async () => {
    mockGet.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    const adaptador = new NominatimGeocodingAdapter();

    const resultado = await adaptador.revGeocodificar(0, 0);

    expect(resultado).toBeNull();
  });

  it('lanza ServicioExternoNoDisponibleError si Nominatim responde con error HTTP', async () => {
    mockGet.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    const adaptador = new NominatimGeocodingAdapter();

    await expect(adaptador.revGeocodificar(-37.9989, -61.3565)).rejects.toThrow(
      ServicioExternoNoDisponibleError,
    );
  });

  it('lanza ServicioExternoNoDisponibleError si la petición a Nominatim falla (red caída, timeout)', async () => {
    mockGet.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));
    const adaptador = new NominatimGeocodingAdapter();

    await expect(adaptador.revGeocodificar(-37.9989, -61.3565)).rejects.toThrow(
      ServicioExternoNoDisponibleError,
    );
  });
});
