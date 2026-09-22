import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { HistorialCompartidoDto } from '@aplicacion/dtos/veterinarios-avanzado/HistorialCompartidoDto';
import type { IRepositorioHistorialesCompartidos } from '@dominio/puertos/IRepositorioHistorialesCompartidos';

export interface ComandoListarHistorialesCompartidos {
  veterinarioOrigenId: string;
}

/**
 * Template Method (CasoDeUsoBase) — vista "mis historiales compartidos"
 * (Módulo 6). Sin verificación de rol propia: solo un veterinario
 * autenticado llega hasta acá (el gateo por feature flag y el rol se
 * resuelven en el route handler, mismo criterio que `CompartirHistorial`
 * en `POST /api/veterinarios/historiales-compartidos`).
 */
@injectable()
export class ListarHistorialesCompartidos extends CasoDeUsoBase<
  ComandoListarHistorialesCompartidos,
  HistorialCompartidoDto[]
> {
  constructor(
    @inject('IRepositorioHistorialesCompartidos')
    private readonly repositorioHistoriales: IRepositorioHistorialesCompartidos,
  ) {
    super();
  }

  protected validar(
    input: ComandoListarHistorialesCompartidos,
  ): ComandoListarHistorialesCompartidos {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver docstring de la clase.
  }

  protected async persistir(
    dato: ComandoListarHistorialesCompartidos,
  ): Promise<HistorialCompartidoDto[]> {
    const historiales = await this.repositorioHistoriales.listarPorOrigen(dato.veterinarioOrigenId);
    return historiales.map((historial) => ({
      id: historial.id,
      mascotaId: historial.mascotaId,
      veterinarioOrigenId: historial.veterinarioOrigenId,
      veterinarioDestinoId: historial.veterinarioDestinoId,
      autorizadoEn: historial.autorizadoEn.toISOString(),
      revocadoEn: historial.revocadoEn ? historial.revocadoEn.toISOString() : null,
    }));
  }
}
