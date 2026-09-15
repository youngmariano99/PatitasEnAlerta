import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioTurnos, TasaNoShow } from '@dominio/puertos/IRepositorioTurnos';

export interface ComandoObtenerTasaNoShow {
  proveedorId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Recordatorios automáticos de
 * turnos" (Módulo 6, Paso 3: "calcular la tasa de no-show como métrica
 * agregada sobre turnos.asistio"). `autorizar()` es un no-op deliberado —
 * mismo criterio que `ListarMisTurnos`/`ObtenerMetricasPropias`: el
 * agregado siempre está acotado a `proveedorId=usuario_actual()`
 * (impuesto por `IRepositorioTurnos.calcularTasaNoShow` mismo, nunca recibe
 * ni interpreta un id declarado por el cliente), así que un usuario sin
 * ningún turno propio simplemente recibe `{ totalConcluidos: 0,
 * totalNoShow: 0, tasa: 0 }` — nunca datos de otro proveedor.
 */
@injectable()
export class ObtenerTasaNoShow extends CasoDeUsoBase<ComandoObtenerTasaNoShow, TasaNoShow> {
  constructor(@inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos) {
    super();
  }

  protected validar(input: ComandoObtenerTasaNoShow): ComandoObtenerTasaNoShow {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver docstring de la clase.
  }

  protected async persistir(dato: ComandoObtenerTasaNoShow): Promise<TasaNoShow> {
    return this.repositorioTurnos.calcularTasaNoShow(dato.proveedorId);
  }
}
