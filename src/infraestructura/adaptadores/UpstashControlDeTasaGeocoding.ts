import { injectable } from 'tsyringe';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type {
  IControlDeTasaConReintento,
  ResultadoControlDeTasa,
} from '@dominio/puertos/IControlDeTasaConReintento';

const MAXIMO_CONSULTAS = 20;
const VENTANA = '10 m';

/**
 * Adapter (Adapter, GoF) sobre Upstash Redis para /api/geocoding/reverse —
 * ventana deslizante por usuario (siempre autenticado, el wizard de reporte
 * ya exige sesión). Prefijo propio (`ratelimit:geocoding`), independiente
 * de los limitadores de reportes (`UpstashControlDeTasa`/
 * `UpstashControlDeTasaAntiSaturacion`) — mismo `IControlDeTasaConReintento`,
 * pero registrado bajo un token de DI distinto (`IControlDeTasaGeocoding`)
 * porque es un límite conceptualmente separado, no una variante del de
 * reportes. Ventana generosa: esto es una comodidad de UX (confirmar la
 * dirección al marcar el mapa), no una acción sensible a abuso como crear
 * un reporte.
 */
@injectable()
export class UpstashControlDeTasaGeocoding implements IControlDeTasaConReintento {
  private readonly limitador: Ratelimit;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        'Faltan las variables de entorno UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.',
      );
    }

    this.limitador = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(MAXIMO_CONSULTAS, VENTANA),
      prefix: 'ratelimit:geocoding',
    });
  }

  async evaluar(identificador: string): Promise<ResultadoControlDeTasa> {
    const resultado = await this.limitador.limit(identificador);
    const reintentarEnSegundos = Math.max(0, Math.ceil((resultado.reset - Date.now()) / 1000));
    return { permitido: resultado.success, reintentarEnSegundos };
  }
}
