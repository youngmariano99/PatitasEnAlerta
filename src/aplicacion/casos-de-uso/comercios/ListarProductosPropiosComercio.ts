import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ProductoComercio } from '@dominio/puertos/IRepositorioProductosComercio';
import type { IRepositorioProductosComercio } from '@dominio/puertos/IRepositorioProductosComercio';
import type { IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import { ComercioPropioNoEncontradoError } from '@dominio/errores/erroresComercios';

/**
 * Template Method (CasoDeUsoBase) — "Mis productos" (Módulo 7): catálogo
 * completo del comercio propio del usuario autenticado. Resuelve el
 * `comercioId` desde la sesión (nunca confiado del cliente), mismo criterio
 * de pertenencia que `PublicarProductoComercio`/`ActualizarProductoComercio`.
 */
@injectable()
export class ListarProductosPropiosComercio extends CasoDeUsoBase<string, ProductoComercio[]> {
  constructor(
    @inject('IRepositorioProductosComercio')
    private readonly repositorioProductos: IRepositorioProductosComercio,
    @inject('IRepositorioComercios') private readonly repositorioComercios: IRepositorioComercios,
  ) {
    super();
  }

  protected validar(usuarioId: string): string {
    return usuarioId;
  }

  protected async autorizar(): Promise<void> {
    // La existencia del comercio propio se resuelve en persistir(): no hay
    // nada más que autorizar (cualquier comerciante ve su propio catálogo).
  }

  protected async persistir(usuarioId: string): Promise<ProductoComercio[]> {
    const comercio = await this.repositorioComercios.obtenerPropio(usuarioId);
    if (!comercio) {
      throw new ComercioPropioNoEncontradoError();
    }
    return this.repositorioProductos.listarPorComercio(comercio.id);
  }
}
