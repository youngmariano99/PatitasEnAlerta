import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioTurnos, PaginaTurnosPropios } from '@dominio/puertos/IRepositorioTurnos';

const TOPE_POR_PAGINA = 50;

export interface ComandoListarMisTurnos {
  solicitanteId: string;
  pagina: number;
  porPagina: number;
}

/**
 * Template Method (CasoDeUsoBase) — Paso 1 (Historia "Monitoreo en tiempo
 * real del turno reservado"). `autorizar()` es un no-op deliberado: la
 * pertenencia no se verifica con una consulta aparte, la impone
 * `IRepositorioTurnos.listarPropios()` mismo (siempre filtra por
 * `reservado_por`, mismo criterio que `ListarNotificacionesPropias` con
 * `usuario_id`), así que no hay forma de que este caso de uso devuelva
 * turnos de otro usuario.
 */
@injectable()
export class ListarMisTurnos extends CasoDeUsoBase<ComandoListarMisTurnos, PaginaTurnosPropios> {
  constructor(@inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos) {
    super();
  }

  protected validar(input: ComandoListarMisTurnos): ComandoListarMisTurnos {
    return {
      ...input,
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver comentario de clase.
  }

  protected async persistir(dato: ComandoListarMisTurnos): Promise<PaginaTurnosPropios> {
    return this.repositorioTurnos.listarPropios(dato.solicitanteId, dato.pagina, dato.porPagina);
  }
}
