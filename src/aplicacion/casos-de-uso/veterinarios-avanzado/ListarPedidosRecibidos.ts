import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type {
  IRepositorioPedidosProducto,
  PaginaPedidos,
} from '@dominio/puertos/IRepositorioPedidosProducto';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_AUTORIZADO = 'veterinario';

export interface ComandoListarPedidosRecibidos {
  veterinarioId: string;
  pagina: number;
  porPagina: number;
}

/**
 * Template Method (CasoDeUsoBase) — `veterinario RU(p, de sus productos)`
 * sobre `pedidos_producto` (docs/ROLES.md, Módulo 6): pedidos recibidos
 * sobre el catálogo propio, mismo criterio de scoping que `ListarMisProductos`.
 */
@injectable()
export class ListarPedidosRecibidos extends CasoDeUsoBase<
  ComandoListarPedidosRecibidos,
  PaginaPedidos
> {
  constructor(
    @inject('IRepositorioPedidosProducto')
    private readonly repositorioPedidos: IRepositorioPedidosProducto,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: ComandoListarPedidosRecibidos): ComandoListarPedidosRecibidos {
    return input;
  }

  protected async autorizar(dato: ComandoListarPedidosRecibidos): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarPedidosRecibidos): Promise<PaginaPedidos> {
    return this.repositorioPedidos.listarPorVeterinario(
      dato.veterinarioId,
      dato.pagina,
      dato.porPagina,
    );
  }
}
