import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  PublicarProductoComercioSchema,
  type ComandoPublicarProductoComercio,
  type ProductoComercioDto,
} from '@aplicacion/dtos/comercios/ProductoComercioDto';
import type { IRepositorioProductosComercio, ProductoComercio } from '@dominio/puertos/IRepositorioProductosComercio';
import type { IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { ComercioNoVerificadoError, ComercioPropioNoEncontradoError } from '@dominio/errores/erroresComercios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { sanitizarDescripcion } from '@infraestructura/seguridad/SanitizadorHtml';

const ROL_AUTORIZADO = 'comerciante';
const ESTADO_VERIFICADO = 'verificado';

/** Payload crudo del formulario + quién publica, resuelto por el route handler desde la sesión. */
export interface EntradaPublicarProductoComercio {
  datosCrudos: unknown;
  usuarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Publicación de catálogo de
 * productos" (Módulo 7, Paso 1: alta restringida al comercio propio; Paso
 * 2: bloqueada mientras `comercios.estado_verificacion <> 'verificado'`,
 * PEA-COM-001). `autorizar()` sigue el mismo orden que
 * `CrearProductoVeterinario`/`RegistrarComercio`: rol correcto primero (más
 * barato, sin depender de qué comercio tenga) → el comercio propio existe
 * (PEA-COM-003, cubre también al comerciante que nunca registró uno) →
 * está verificado (PEA-COM-001).
 *
 * `persistir()` vuelve a resolver el comercio propio en vez de reutilizar
 * cualquier dato leído en `autorizar()` — mismo criterio de "nunca confiar
 * en una lectura previa" que el resto de los comandos de este proyecto — y
 * sanitiza `descripcion` con DOMPurify (Paso 3) recién ahí, justo antes de
 * persistir.
 */
@injectable()
export class PublicarProductoComercio extends CasoDeUsoBase<
  EntradaPublicarProductoComercio,
  ProductoComercioDto,
  ComandoPublicarProductoComercio
> {
  constructor(
    @inject('IRepositorioProductosComercio') private readonly repositorioProductos: IRepositorioProductosComercio,
    @inject('IRepositorioComercios') private readonly repositorioComercios: IRepositorioComercios,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaPublicarProductoComercio): ComandoPublicarProductoComercio {
    const datos = PublicarProductoComercioSchema.parse(input.datosCrudos);
    return { ...datos, usuarioId: input.usuarioId };
  }

  protected async autorizar(dato: ComandoPublicarProductoComercio): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.usuarioId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }

    const comercio = await this.repositorioComercios.obtenerPropio(dato.usuarioId);
    if (!comercio) {
      throw new ComercioPropioNoEncontradoError();
    }
    if (comercio.estadoVerificacion !== ESTADO_VERIFICADO) {
      throw new ComercioNoVerificadoError();
    }
  }

  protected async persistir(dato: ComandoPublicarProductoComercio): Promise<ProductoComercioDto> {
    const comercio = await this.repositorioComercios.obtenerPropio(dato.usuarioId);
    if (!comercio) {
      throw new ComercioPropioNoEncontradoError();
    }

    const producto = await this.repositorioProductos.crear(comercio.id, {
      nombre: dato.nombre,
      descripcion: sanitizarDescripcion(dato.descripcion),
      categoria: dato.categoria,
      precio: dato.precio,
    });

    return this.aDto(producto);
  }

  private aDto(producto: ProductoComercio): ProductoComercioDto {
    return {
      id: producto.id,
      comercioId: producto.comercioId,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      precio: producto.precio,
      createdAt: producto.createdAt.toISOString(),
    };
  }
}
