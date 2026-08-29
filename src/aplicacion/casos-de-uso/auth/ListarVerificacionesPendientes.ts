import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import type { IRepositorioVerificaciones } from '@dominio/puertos/IRepositorioVerificaciones';
import type { PaginaVerificacionesPendientes } from '@dominio/entidades/Verificacion';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_ADMINISTRADOR = 'administrador';
const TOPE_POR_PAGINA = 50;

export interface ComandoListarVerificaciones {
  solicitanteId: string;
  pagina: number;
  porPagina: number;
}

/**
 * Template Method aplicado a una consulta paginada (mismo criterio que
 * ObtenerPerfilPropio): validar/persistir hacen la lectura, autorizar exige
 * rol_actual() === 'administrador'.
 */
@injectable()
export class ListarVerificacionesPendientes extends CasoDeUsoBase<ComandoListarVerificaciones, PaginaVerificacionesPendientes> {
  constructor(
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
    @inject('IRepositorioVerificaciones') private readonly repositorioVerificaciones: IRepositorioVerificaciones,
  ) {
    super();
  }

  protected validar(input: ComandoListarVerificaciones): ComandoListarVerificaciones {
    return {
      ...input,
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      // Tope 50 impuesto acá también (no solo en el route handler): defensa
      // en profundidad ante cualquier llamador futuro del caso de uso.
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(dato: ComandoListarVerificaciones): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.solicitanteId);
    if (!solicitante || solicitante.rol !== ROL_ADMINISTRADOR) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarVerificaciones): Promise<PaginaVerificacionesPendientes> {
    return this.repositorioVerificaciones.listarPendientes(dato.pagina, dato.porPagina);
  }
}
