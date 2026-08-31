import { injectable } from 'tsyringe';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { IControlDeTasaConReintento, ResultadoControlDeTasa } from '@dominio/puertos/IControlDeTasaConReintento';

const MAXIMO_REPORTES_POR_HORA = 5;
const VENTANA = '1 h';

/**
 * Adapter (patrón Adapter) sobre Upstash Redis — Historia "Rate limiting
 * anti-saturación en la creación de reportes". Ventana deslizante: como
 * máximo `MAXIMO_REPORTES_POR_HORA` reportes por identificador (el id del
 * usuario que reporta) cada `VENTANA`, exclusivo de ConRateLimitDecorator.ts
 * (que decide de antemano si el usuario amerita este límite — ver ese
 * archivo). Prefijo distinto (`ratelimit:reportes:anti-saturacion`) del que
 * usa UpstashControlDeTasa (`ratelimit:reportes`, 3 cada 10 min, aplicado a
 * TODO usuario vía el pipeline de ValidacionReporte.ts): son dos contadores
 * independientes sobre el mismo Redis, cada uno con su propia ventana y
 * público objetivo, y ninguno reemplaza al otro.
 */
@injectable()
export class UpstashControlDeTasaAntiSaturacion implements IControlDeTasaConReintento {
  private readonly limitador: Ratelimit;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('Faltan las variables de entorno UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.');
    }

    this.limitador = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(MAXIMO_REPORTES_POR_HORA, VENTANA),
      prefix: 'ratelimit:reportes:anti-saturacion',
    });
  }

  async evaluar(identificador: string): Promise<ResultadoControlDeTasa> {
    const resultado = await this.limitador.limit(identificador);
    const reintentarEnSegundos = Math.max(0, Math.ceil((resultado.reset - Date.now()) / 1000));
    return { permitido: resultado.success, reintentarEnSegundos };
  }
}
