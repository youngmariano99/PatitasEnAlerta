import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioColaboraciones, MetricasColaboracionPropias } from '@dominio/puertos/IRepositorioColaboraciones';

export interface ComandoObtenerMetricasPropias {
  stakeholderId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Métricas personales de
 * contribución" (Módulo 5, docs/REQUISITOS.md Post-MVP: "Consultar sus
 * propias métricas de contribución, sin exposición pública comparativa
 * frente a otros usuarios").
 *
 * `autorizar()` es un no-op deliberado — mismo criterio que
 * `ListarMisTurnos`/`ReservarTurnoCommand`: la pertenencia no se verifica
 * con una consulta aparte, la impone
 * `IRepositorioColaboraciones.obtenerMetricasPropias()` mismo (siempre
 * agrega con `WHERE stakeholder_id = stakeholderId`, nunca recibe ni
 * interpreta ningún id declarado por el cliente), así que no hay forma de
 * que este caso de uso devuelva datos de otro usuario. No se restringe por
 * rol (rescatista/veterinario): un usuario de cualquier otro rol que la
 * invoque simplemente nunca tiene filas como `stakeholder_id` en
 * `colaboraciones`, así que recibe `{ totalCompletadas: 0, porTipo: {} }` —
 * mismo comportamiento inofensivo que pedir el listado propio de un recurso
 * que nunca creaste.
 *
 * El resultado es intencionalmente un agregado (total + desglose por tipo),
 * nunca una lista de filas ni un promedio/ranking calculado sobre otros
 * usuarios (Paso 2 del ticket, verificado también por
 * `MetricasPropiasSchema`, que no declara ningún campo comparativo).
 */
@injectable()
export class ObtenerMetricasPropias extends CasoDeUsoBase<ComandoObtenerMetricasPropias, MetricasColaboracionPropias> {
  constructor(@inject('IRepositorioColaboraciones') private readonly repositorioColaboraciones: IRepositorioColaboraciones) {
    super();
  }

  protected validar(input: ComandoObtenerMetricasPropias): ComandoObtenerMetricasPropias {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver docstring de la clase.
  }

  protected async persistir(dato: ComandoObtenerMetricasPropias): Promise<MetricasColaboracionPropias> {
    return this.repositorioColaboraciones.obtenerMetricasPropias(dato.stakeholderId);
  }
}
