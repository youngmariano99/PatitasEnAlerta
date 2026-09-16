import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { HistorialCompartidoDto } from '@aplicacion/dtos/veterinarios-avanzado/HistorialCompartidoDto';
import type { IRepositorioHistorialesCompartidos } from '@dominio/puertos/IRepositorioHistorialesCompartidos';
import { HistorialCompartidoNoEncontradoError } from '@dominio/errores/erroresVeterinariosAvanzados';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

export interface ComandoRevocarHistorialCompartido {
  historialId: string;
  veterinarioOrigenId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Paso 2 de "CRUD de historiales_compartidos
 * con autorización explícita y revocable" (Módulo 6). Nunca es un DELETE
 * físico: marca `revocado_en = now()`, preservando la fila para auditoría
 * (AC explícito del ticket) — mismo criterio que `RevocarAutorizacionLibreta`.
 *
 * `autorizar()` lee el historial para decidir el 403 explícito cuando quien
 * invoca no es el veterinario origen (AC: "el veterinario origen lo
 * revoca"); `persistir()` nunca confía en esa lectura previa — repite la
 * condición `id + veterinarioOrigenId + revocadoEn IS NULL` en el propio
 * UPDATE (defensa ante una revocación concurrente del mismo historial).
 */
@injectable()
export class RevocarHistorialCompartido extends CasoDeUsoBase<ComandoRevocarHistorialCompartido, HistorialCompartidoDto> {
  constructor(
    @inject('IRepositorioHistorialesCompartidos')
    private readonly repositorioHistoriales: IRepositorioHistorialesCompartidos,
  ) {
    super();
  }

  protected validar(input: ComandoRevocarHistorialCompartido): ComandoRevocarHistorialCompartido {
    return input;
  }

  protected async autorizar(dato: ComandoRevocarHistorialCompartido): Promise<void> {
    const historial = await this.repositorioHistoriales.obtenerActual(dato.historialId);
    if (!historial) {
      throw new HistorialCompartidoNoEncontradoError();
    }
    if (historial.veterinarioOrigenId !== dato.veterinarioOrigenId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoRevocarHistorialCompartido): Promise<HistorialCompartidoDto> {
    const revocado = await this.repositorioHistoriales.revocar(dato.historialId, dato.veterinarioOrigenId);
    if (!revocado || !revocado.revocadoEn) {
      throw new HistorialCompartidoNoEncontradoError();
    }

    return {
      id: revocado.id,
      mascotaId: revocado.mascotaId,
      veterinarioOrigenId: revocado.veterinarioOrigenId,
      veterinarioDestinoId: revocado.veterinarioDestinoId,
      autorizadoEn: revocado.autorizadoEn.toISOString(),
      revocadoEn: revocado.revocadoEn.toISOString(),
    };
  }

  protected override async publicarEvento(resultado: HistorialCompartidoDto): Promise<void> {
    logger.info(
      { evento: 'HistorialCompartidoRevocado', historialId: resultado.id, veterinarioOrigenId: resultado.veterinarioOrigenId },
      'Evento de dominio publicado',
    );
  }
}
