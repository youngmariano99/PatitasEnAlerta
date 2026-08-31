import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { INotificacionesRepositorio, PaginaNotificaciones } from '@dominio/puertos/INotificacionesRepositorio';

const TOPE_POR_PAGINA = 50;

export interface ComandoListarNotificaciones {
  solicitanteId: string;
  pagina: number;
  porPagina: number;
}

/**
 * Template Method (CasoDeUsoBase) — Paso 3 (bandeja propia). `autorizar()`
 * es un no-op deliberado: la pertenencia no se verifica con una consulta
 * aparte, la impone `IRepositorioNotificaciones.listarPorUsuario()` mismo
 * (siempre filtra por `usuarioId` — mismo criterio que
 * `IRepositorioMascotas.listarPorDueño`), así que no hay forma de que este
 * caso de uso devuelva la bandeja de otro usuario.
 */
@injectable()
export class ListarNotificacionesPropias extends CasoDeUsoBase<ComandoListarNotificaciones, PaginaNotificaciones> {
  constructor(@inject('INotificacionesRepositorio') private readonly repositorioNotificaciones: INotificacionesRepositorio) {
    super();
  }

  protected validar(input: ComandoListarNotificaciones): ComandoListarNotificaciones {
    return {
      ...input,
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver comentario de clase.
  }

  protected async persistir(dato: ComandoListarNotificaciones): Promise<PaginaNotificaciones> {
    return this.repositorioNotificaciones.listarPorUsuario(dato.solicitanteId, dato.pagina, dato.porPagina);
  }
}
