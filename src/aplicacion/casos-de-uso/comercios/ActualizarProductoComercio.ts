import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ActualizarProductoComercioSchema,
  type DatosActualizarProductoComercioDto,
  type ProductoComercioDto,
} from '@aplicacion/dtos/comercios/ProductoComercioDto';
import type { IRepositorioProductosComercio, ProductoComercioActual } from '@dominio/puertos/IRepositorioProductosComercio';
import type { IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import { ProductoComercioNoEncontradoError } from '@dominio/errores/erroresComercios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { sanitizarDescripcion } from '@infraestructura/seguridad/SanitizadorHtml';

/** Payload crudo del cliente + el producto a editar + quién edita, resuelto por el route handler desde la ruta/sesión. */
export interface EntradaActualizarProductoComercio {
  datosCrudos: unknown;
  productoId: string;
  usuarioId: string;
}

/** El comando ya validado, con el producto actual adjunto — `autorizar()` lo necesita sin volver a consultarlo. */
interface ComandoActualizarProductoComercioValidado extends DatosActualizarProductoComercioDto {
  productoId: string;
  usuarioId: string;
  actual: ProductoComercioActual;
}

/**
 * Template Method (CasoDeUsoBase) — edición de un producto propio (Módulo
 * 7, Paso 1). Mismo esqueleto de tres pasos que
 * `ActualizarProductoVeterinario` (Módulo 6): `validar()` hace la única
 * lectura del producto (Zod + `obtenerActual`, 404 PEA-COM-004 si no
 * existe); `autorizar()` reutiliza ese producto ya leído, resuelve el
 * comercio propio del usuario autenticado y compara — AC explícito del
 * ticket: "intenta editar el producto de otro comercio → 403". No vuelve a
 * exigir `estado_verificacion='verificado'`: el AC de ese bloqueo
 * (PEA-COM-001) se redacta específicamente sobre "publicar", no sobre
 * editar un producto ya publicado (docs/DECISIONES.md). `persistir()` nunca
 * confía en esa lectura para decidir éxito/fracaso: el UPDATE condicionado
 * por `id` + `comercio_id` es la última palabra.
 */
@injectable()
export class ActualizarProductoComercio extends CasoDeUsoBase<
  EntradaActualizarProductoComercio,
  ProductoComercioDto,
  ComandoActualizarProductoComercioValidado
> {
  constructor(
    @inject('IRepositorioProductosComercio') private readonly repositorioProductos: IRepositorioProductosComercio,
    @inject('IRepositorioComercios') private readonly repositorioComercios: IRepositorioComercios,
  ) {
    super();
  }

  protected async validar(input: EntradaActualizarProductoComercio): Promise<ComandoActualizarProductoComercioValidado> {
    const datos = ActualizarProductoComercioSchema.parse(input.datosCrudos);

    const actual = await this.repositorioProductos.obtenerActual(input.productoId);
    if (!actual) {
      throw new ProductoComercioNoEncontradoError();
    }

    return { ...datos, productoId: input.productoId, usuarioId: input.usuarioId, actual };
  }

  protected async autorizar(dato: ComandoActualizarProductoComercioValidado): Promise<void> {
    const comercio = await this.repositorioComercios.obtenerPropio(dato.usuarioId);
    if (!comercio || comercio.id !== dato.actual.comercioId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoActualizarProductoComercioValidado): Promise<ProductoComercioDto> {
    const actualizado = await this.repositorioProductos.actualizar(dato.productoId, dato.actual.comercioId, {
      nombre: dato.nombre,
      descripcion: sanitizarDescripcion(dato.descripcion),
      categoria: dato.categoria,
      precio: dato.precio,
    });
    if (!actualizado) {
      throw new ProductoComercioNoEncontradoError();
    }

    return {
      id: actualizado.id,
      comercioId: actualizado.comercioId,
      nombre: actualizado.nombre,
      descripcion: actualizado.descripcion,
      categoria: actualizado.categoria,
      precio: actualizado.precio,
      createdAt: actualizado.createdAt.toISOString(),
    };
  }
}
