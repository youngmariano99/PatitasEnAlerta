import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import type { IRepositorioVerificaciones } from '@dominio/puertos/IRepositorioVerificaciones';
import type { PaginaHistorialVerificaciones } from '@dominio/entidades/Verificacion';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_ADMINISTRADOR = 'administrador';
const TOPE_POR_PAGINA = 50;

export interface ComandoListarHistorial {
  solicitanteId: string;
  pagina: number;
  porPagina: number;
}

/**
 * Template Method aplicado a una consulta de solo lectura (mismo criterio
 * que ListarVerificacionesPendientes): autorizar exige rol_actual() ===
 * 'administrador' — acá es la ÚNICA verificación de acceso, no hay ninguna
 * acción de escritura que este caso de uso pueda ofrecer sobre un registro
 * ya resuelto (verificación técnica del ticket AUTH-09).
 */
@injectable()
export class ListarHistorialVerificaciones extends CasoDeUsoBase<ComandoListarHistorial, PaginaHistorialVerificaciones> {
  constructor(
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
    @inject('IRepositorioVerificaciones') private readonly repositorioVerificaciones: IRepositorioVerificaciones,
  ) {
    super();
  }

  protected validar(input: ComandoListarHistorial): ComandoListarHistorial {
    return {
      ...input,
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      // Tope 50 impuesto acá también (no solo en el route handler): defensa
      // en profundidad ante cualquier llamador futuro del caso de uso.
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(dato: ComandoListarHistorial): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.solicitanteId);
    if (!solicitante || solicitante.rol !== ROL_ADMINISTRADOR) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarHistorial): Promise<PaginaHistorialVerificaciones> {
    return this.repositorioVerificaciones.listarResueltas(dato.pagina, dato.porPagina);
  }
}
