import { logger } from '@infraestructura/logging/logger';

/**
 * Patrón Template Method: esqueleto común a todo caso de uso de escritura
 * (validar → autorizar → persistir → loggear → publicar evento de dominio).
 * Reutilizado por CrearReporte, PublicarEvento, RegistrarEntradaLibreta, etc.
 * Cada caso de uso concreto implementa los pasos abstractos; el orden y el
 * manejo de errores viven acá una sola vez.
 *
 * `TValidado` (por defecto `TInput`, así ningún caso de uso existente tiene
 * que declararlo) es el tipo que `validar` entrega y que `autorizar`/
 * `persistir` reciben. La mayoría de los casos de uso no lo necesitan
 * distinto de `TInput` porque validan con `Schema.parse(input)` sobre el
 * mismo shape. CrearReporte sí: su `TInput` es el payload crudo del route
 * handler (`{ datosCrudos, reportadoPor }`) y `validar` delega en el pipeline
 * Chain of Responsibility de ValidacionReporte.ts, que devuelve un
 * `ComandoCrearReporte` ya tipado — un shape distinto, no una variación del
 * de entrada. `validar` también puede ser asincrónico (ese pipeline hace I/O
 * real en su eslabón ValidadorRateLimit contra Upstash); `await` sobre un
 * valor no-Promise es un no-op, así que esto no cambia el comportamiento de
 * los casos de uso síncronos existentes.
 */
export abstract class CasoDeUsoBase<TInput, TOutput, TValidado = TInput> {
  async ejecutar(input: TInput): Promise<TOutput> {
    const dtoValidado = await this.validar(input);
    await this.autorizar(dtoValidado);
    const resultado = await this.persistir(dtoValidado);
    logger.info({ caso: this.constructor.name }, 'Caso de uso ejecutado');
    await this.publicarEvento(resultado);
    return resultado;
  }

  protected abstract validar(input: TInput): TValidado | Promise<TValidado>;
  protected abstract autorizar(dato: TValidado): Promise<void>;
  protected abstract persistir(dato: TValidado): Promise<TOutput>;
  protected async publicarEvento(_resultado: TOutput): Promise<void> {
    // Sobrescribir en el caso de uso concreto si corresponde publicar
    // un evento de dominio (patrón Observer). No-op por defecto.
  }
}
