import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { ActualizarProductoSchema, type ComandoActualizarProducto } from '@aplicacion/dtos/veterinarios-avanzado/ProductoVeterinarioDto';
import type { IRepositorioProductosVeterinario, ProductoActual, ProductoVeterinario } from '@dominio/puertos/IRepositorioProductosVeterinario';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { ProductoNoDisponibleError } from '@dominio/errores/erroresVeterinariosAvanzados';

/** Payload crudo del cliente + el producto a editar + quién edita, resuelto por el route handler desde la ruta/sesión. */
export interface EntradaActualizarProducto {
  datosCrudos: unknown;
  productoId: string;
  veterinarioId: string;
}

/** El comando ya validado, con el producto actual adjunto — `autorizar()` lo necesita sin volver a consultarlo. */
interface ComandoActualizarProductoValidado extends ComandoActualizarProducto {
  actual: ProductoActual;
}

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — edición de un producto
 * propio (Módulo 6, Paso 1). Mismo esqueleto de tres pasos que
 * `ActualizarAsistioTurnoCommand`/`CancelarTurnoCommand` (recurso existe →
 * pertenece a quien invoca → el UPDATE condicionado es la última palabra):
 *
 * `validar()` hace la única lectura del producto (Zod + `obtenerActual`) y
 * decide ahí mismo si es 404 (PEA-VETADV-002 — no encontrado o soft-deleted).
 * `autorizar()` reutiliza ese producto ya leído para el chequeo de
 * pertenencia: solo el veterinario dueño puede editarlo (AC explícito del
 * ticket: "intenta editar el producto de otro veterinario → 403",
 * PEA-SIS-002). `persistir()` nunca confía en esa lectura: el UPDATE
 * condicionado por `id` + `veterinario_id` (`IRepositorioProductosVeterinario
 * .actualizar`) es la última palabra — 0 filas afectadas ahí solo puede
 * significar que el producto se eliminó entre `validar()` y este paso (ya
 * se descartó "no es el dueño" en `autorizar()`), lo que se traduce
 * igualmente en PEA-VETADV-002, nunca un error de sistema.
 */
@injectable()
export class ActualizarProductoVeterinario extends CasoDeUsoBase<
  EntradaActualizarProducto,
  ProductoVeterinario,
  ComandoActualizarProductoValidado
> {
  constructor(@inject('IRepositorioProductosVeterinario') private readonly repositorioProductos: IRepositorioProductosVeterinario) {
    super();
  }

  protected async validar(input: EntradaActualizarProducto): Promise<ComandoActualizarProductoValidado> {
    const datos = ActualizarProductoSchema.parse(input.datosCrudos);

    const actual = await this.repositorioProductos.obtenerActual(input.productoId);
    if (!actual) {
      throw new ProductoNoDisponibleError();
    }

    return { ...datos, productoId: input.productoId, veterinarioId: input.veterinarioId, actual };
  }

  protected async autorizar(dato: ComandoActualizarProductoValidado): Promise<void> {
    if (dato.actual.veterinarioId !== dato.veterinarioId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoActualizarProductoValidado): Promise<ProductoVeterinario> {
    const actualizado = await this.repositorioProductos.actualizar(dato.productoId, dato.veterinarioId, {
      nombre: dato.nombre,
      descripcion: dato.descripcion,
      precio: dato.precio,
      stock: dato.stock,
    });
    if (!actualizado) {
      throw new ProductoNoDisponibleError();
    }
    return actualizado;
  }
}
