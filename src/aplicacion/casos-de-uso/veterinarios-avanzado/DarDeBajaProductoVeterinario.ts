import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioProductosVeterinario, ProductoActual } from '@dominio/puertos/IRepositorioProductosVeterinario';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { ProductoNoDisponibleError } from '@dominio/errores/erroresVeterinariosAvanzados';

export interface ComandoDarDeBajaProducto {
  productoId: string;
  veterinarioId: string;
}

export interface ProductoDadoDeBaja {
  id: string;
}

/** El comando con el producto actual adjunto — `autorizar()` lo necesita sin volver a consultarlo. */
interface ComandoDarDeBajaProductoValidado extends ComandoDarDeBajaProducto {
  actual: ProductoActual;
}

/**
 * Template Method (CasoDeUsoBase) — baja (soft delete) de un producto propio
 * (Módulo 6, Paso 1, CRUD completo). Mismo esqueleto de 403 explícito ante
 * pertenencia ajena que `ActualizarProductoVeterinario` (consistencia entre
 * las dos operaciones de escritura sobre un producto puntual del mismo
 * CRUD), a diferencia de `DarDeBajaDisponibilidad` (que colapsa "no es tuyo"
 * y "no existe" en un único 404 anti-enumeración) — acá el AC del ticket ya
 * fija explícitamente 403 para la pertenencia ajena en la operación hermana
 * de edición, así que se usa el mismo criterio en toda la superficie de
 * escritura del CRUD, no una mezcla de dos filosofías distintas.
 */
@injectable()
export class DarDeBajaProductoVeterinario extends CasoDeUsoBase<
  ComandoDarDeBajaProducto,
  ProductoDadoDeBaja,
  ComandoDarDeBajaProductoValidado
> {
  constructor(@inject('IRepositorioProductosVeterinario') private readonly repositorioProductos: IRepositorioProductosVeterinario) {
    super();
  }

  protected async validar(input: ComandoDarDeBajaProducto): Promise<ComandoDarDeBajaProductoValidado> {
    const actual = await this.repositorioProductos.obtenerActual(input.productoId);
    if (!actual) {
      throw new ProductoNoDisponibleError();
    }
    return { ...input, actual };
  }

  protected async autorizar(dato: ComandoDarDeBajaProductoValidado): Promise<void> {
    if (dato.actual.veterinarioId !== dato.veterinarioId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoDarDeBajaProductoValidado): Promise<ProductoDadoDeBaja> {
    const dadaDeBaja = await this.repositorioProductos.darDeBaja(dato.productoId, dato.veterinarioId);
    if (!dadaDeBaja) {
      throw new ProductoNoDisponibleError();
    }
    return { id: dato.productoId };
  }
}
