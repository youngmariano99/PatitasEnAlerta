import { injectable } from 'tsyringe';
import { Redis } from '@upstash/redis';
import type {
  IServicioGeocodificacion,
  ResultadoGeocodificacionInversa,
} from '@dominio/puertos/IServicioGeocodificacion';
import { ServicioExternoNoDisponibleError } from '@dominio/errores/erroresTransversales';

// Nominatim exige un User-Agent que identifique realmente a la app que lo
// consume (política de uso de OpenStreetMap) — la URL del repo es la
// identificación elegida (estable, no expone un email personal).
const USER_AGENT = 'PatitasEnAlerta/1.0 (https://github.com/youngmariano99/PatitasEnAlerta)';

const TTL_CACHE_SEGUNDOS = 60 * 60 * 24 * 7; // 7 días — una dirección no cambia.
const PREFIJO_CACHE = 'geocoding';

interface RespuestaNominatim {
  display_name?: string;
  address?: {
    state?: string;
    country?: string;
    [clave: string]: string | undefined;
  };
}

/**
 * Adapter (Adapter, GoF) sobre la API pública de Nominatim/OpenStreetMap —
 * geocodificación inversa (lat/lon → dirección aproximada). Cachea en el
 * mismo Redis de Upstash ya usado para rate-limit (sin infraestructura
 * nueva), clave redondeada a 3 decimales (~110m de precisión, suficiente
 * para "qué calle/barrio es") — reduce pedidos repetidos a Nominatim, cuya
 * política de uso desalienta el uso intensivo sin caché.
 */
@injectable()
export class NominatimGeocodingAdapter implements IServicioGeocodificacion {
  private readonly redis: Redis;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        'Faltan las variables de entorno UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.',
      );
    }
    this.redis = new Redis({ url, token });
  }

  async revGeocodificar(lat: number, lon: number): Promise<ResultadoGeocodificacionInversa | null> {
    const clave = `${PREFIJO_CACHE}:${lat.toFixed(3)}:${lon.toFixed(3)}`;

    const cacheado = await this.redis.get<ResultadoGeocodificacionInversa | null>(clave);
    if (cacheado !== null && cacheado !== undefined) {
      return cacheado;
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    let respuesta: Response;
    try {
      respuesta = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    } catch {
      throw new ServicioExternoNoDisponibleError();
    }
    if (!respuesta.ok) {
      throw new ServicioExternoNoDisponibleError();
    }

    const datos = (await respuesta.json()) as RespuestaNominatim;
    const resultado: ResultadoGeocodificacionInversa | null = datos.address
      ? {
          direccionCorta: datos.display_name ?? '',
          provincia: datos.address.state ?? null,
          pais: datos.address.country ?? null,
        }
      : null;

    await this.redis.set(clave, resultado, { ex: TTL_CACHE_SEGUNDOS });
    return resultado;
  }
}
