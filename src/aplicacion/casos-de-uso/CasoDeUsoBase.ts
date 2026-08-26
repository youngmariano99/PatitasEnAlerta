import { logger } from '@infraestructura/logging/logger';

/**
 * Patrón Template Method: esqueleto común a todo caso de uso de escritura
 * (validar → autorizar → persistir → loggear → publicar evento de dominio).
 * Reutilizado por CrearReporte, PublicarEvento, RegistrarEntradaLibreta, etc.
 * Cada caso de uso concreto implementa los pasos abstractos; el orden y el
 * manejo de errores viven acá una sola vez.
 */
export abstract class CasoDeUsoBase<TInput, TOutput> {
  async ejecutar(input: TInput): Promise<TOutput> {
    const dtoValidado = this.validar(input);
    await this.autorizar(dtoValidado);
    const resultado = await this.persistir(dtoValidado);
    logger.info({ caso: this.constructor.name }, 'Caso de uso ejecutado');
    await this.publicarEvento(resultado);
    return resultado;
  }

  protected abstract validar(input: TInput): TInput;
  protected abstract autorizar(dato: TInput): Promise<void>;
  protected abstract persistir(dato: TInput): Promise<TOutput>;
  protected async publicarEvento(_resultado: TOutput): Promise<void> {
    // Sobrescribir en el caso de uso concreto si corresponde publicar
    // un evento de dominio (patrón Observer). No-op por defecto.
  }
}
