import { injectable } from 'tsyringe';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';

const MAXIMO_REPORTES_POR_VENTANA = 3;
const VENTANA = '10 m';

/**
 * Adapter (patrón Adapter) sobre Upstash Redis. Ventana deslizante: como
 * máximo `MAXIMO_REPORTES_POR_VENTANA` reportes por identificador (el id del
 * usuario autenticado — ver ValidadorRateLimit) cada `VENTANA`, anti-spam
 * (PEA-REP-004, docs/ERRORS.md Módulo 2). El prefijo aísla este contador del
 * de cualquier otro rate limit que se agregue más adelante sobre el mismo
 * Redis (ej. login, recuperación de password).
 */
@injectable()
export class UpstashControlDeTasa implements IControlDeTasa {
  private readonly limitador: Ratelimit;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('Faltan las variables de entorno UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.');
    }

    this.limitador = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(MAXIMO_REPORTES_POR_VENTANA, VENTANA),
      prefix: 'ratelimit:reportes',
    });
  }

  async permitir(identificador: string): Promise<boolean> {
    const resultado = await this.limitador.limit(identificador);
    return resultado.success;
  }
}
