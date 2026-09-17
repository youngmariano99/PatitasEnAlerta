import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type {
  IRepositorioPedidosProducto,
  PaginaPedidos,
} from '@dominio/puertos/IRepositorioPedidosProducto';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_AUTORIZADO = 'dueño';

export interface ComandoListarMisPedidos {
  compradorId: string;
  pagina: number;
  porPagina: number;
}

/**
 * Template Method (CasoDeUsoBase) — `dueño CR(p)` sobre `pedidos_producto`
 * (docs/ROLES.md, Módulo 6): un dueño ve únicamente los pedidos que él
 * mismo generó, mismo criterio de scoping por sesión que `ListarMisProductos`.
 */
@injectable()
export class ListarMisPedidos extends CasoDeUsoBase<ComandoListarMisPedidos, PaginaPedidos> {
  constructor(
    @inject('IRepositorioPedidosProducto')
    private readonly repositorioPedidos: IRepositorioPedidosProducto,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: ComandoListarMisPedidos): ComandoListarMisPedidos {
    return input;
  }

  protected async autorizar(dato: ComandoListarMisPedidos): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.compradorId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarMisPedidos): Promise<PaginaPedidos> {
    return this.repositorioPedidos.listarPorComprador(
      dato.compradorId,
      dato.pagina,
      dato.porPagina,
    );
  }
}
