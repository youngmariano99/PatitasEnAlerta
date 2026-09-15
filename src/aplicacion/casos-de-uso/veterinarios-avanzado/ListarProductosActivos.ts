import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioProductosVeterinario, PaginaProductos } from '@dominio/puertos/IRepositorioProductosVeterinario';

export interface ComandoListarProductosActivos {
  pagina: number;
  porPagina: number;
}

/**
 * Template Method (CasoDeUsoBase) — catálogo público de productos
 * veterinarios (Módulo 6, docs/ROLES.md: lectura de `productos_veterinario`
 * es Patrón B — pública, `deleted_at IS NULL`, mismo criterio que
 * `reportes`/`eventos`/`vitrina_adopcion`, ver Sección 3.3). `autorizar()`
 * es un no-op deliberado: sin sesión, sin restricción de rol — mismo
 * criterio que `ListarReportes`. Este listado es lo que le permite a un
 * dueño descubrir el `productoId` que luego usa `GenerarPedidoCommand`.
 */
@injectable()
export class ListarProductosActivos extends CasoDeUsoBase<ComandoListarProductosActivos, PaginaProductos> {
  constructor(@inject('IRepositorioProductosVeterinario') private readonly repositorioProductos: IRepositorioProductosVeterinario) {
    super();
  }

  protected validar(input: ComandoListarProductosActivos): ComandoListarProductosActivos {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver docstring de la clase.
  }

  protected async persistir(dato: ComandoListarProductosActivos): Promise<PaginaProductos> {
    return this.repositorioProductos.listarActivos(dato.pagina, dato.porPagina);
  }
}
