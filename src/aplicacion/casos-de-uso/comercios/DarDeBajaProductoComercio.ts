import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioProductosComercio, ProductoComercioActual } from '@dominio/puertos/IRepositorioProductosComercio';
import type { IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import { ProductoComercioNoEncontradoError } from '@dominio/errores/erroresComercios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

export interface ComandoDarDeBajaProductoComercio {
  productoId: string;
  usuarioId: string;
}

export interface ProductoComercioDadoDeBaja {
  id: string;
}

/** El comando con el producto actual adjunto — `autorizar()` lo necesita sin volver a consultarlo. */
interface ComandoDarDeBajaProductoComercioValidado extends ComandoDarDeBajaProductoComercio {
  actual: ProductoComercioActual;
}

/**
 * Template Method (CasoDeUsoBase) — baja (soft delete) de un producto propio
 * (Módulo 7, Paso 1, CRUD completo). Mismo esqueleto de 403 explícito ante
 * pertenencia ajena que `ActualizarProductoComercio` (consistencia entre las
 * dos operaciones de escritura del mismo CRUD sobre un producto puntual),
 * mismo criterio ya establecido en `DarDeBajaProductoVeterinario` (Módulo 6).
 */
@injectable()
export class DarDeBajaProductoComercio extends CasoDeUsoBase<
  ComandoDarDeBajaProductoComercio,
  ProductoComercioDadoDeBaja,
  ComandoDarDeBajaProductoComercioValidado
> {
  constructor(
    @inject('IRepositorioProductosComercio') private readonly repositorioProductos: IRepositorioProductosComercio,
    @inject('IRepositorioComercios') private readonly repositorioComercios: IRepositorioComercios,
  ) {
    super();
  }

  protected async validar(input: ComandoDarDeBajaProductoComercio): Promise<ComandoDarDeBajaProductoComercioValidado> {
    const actual = await this.repositorioProductos.obtenerActual(input.productoId);
    if (!actual) {
      throw new ProductoComercioNoEncontradoError();
    }
    return { ...input, actual };
  }

  protected async autorizar(dato: ComandoDarDeBajaProductoComercioValidado): Promise<void> {
    const comercio = await this.repositorioComercios.obtenerPropio(dato.usuarioId);
    if (!comercio || comercio.id !== dato.actual.comercioId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoDarDeBajaProductoComercioValidado): Promise<ProductoComercioDadoDeBaja> {
    const dadaDeBaja = await this.repositorioProductos.darDeBaja(dato.productoId, dato.actual.comercioId);
    if (!dadaDeBaja) {
      throw new ProductoComercioNoEncontradoError();
    }
    return { id: dato.productoId };
  }
}
