import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { CrearProductoSchema, type ComandoCrearProducto } from '@aplicacion/dtos/veterinarios-avanzado/ProductoVeterinarioDto';
import type { IRepositorioProductosVeterinario, ProductoVeterinario } from '@dominio/puertos/IRepositorioProductosVeterinario';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_AUTORIZADO = 'veterinario';

/** Payload crudo del formulario + quién publica, resuelto por el route handler desde la sesión. */
export interface EntradaCrearProducto {
  datosCrudos: unknown;
  veterinarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Venta de productos
 * veterinarios" (Módulo 6, Paso 1: alta del CRUD restringido al
 * `veterinario_id` propio). `autorizar()` exige exclusivamente rol
 * `veterinario` (docs/ROLES.md, matriz Módulo 6: `productos_veterinario` es
 * `CRUD(p)` únicamente para ese rol) — mismo patrón `ROL_AUTORIZADO`
 * singular que `PublicarSolicitudRecurso`. `persistir()` siempre inserta con
 * `veterinario_id = veterinarioId` de la sesión, nunca del body.
 */
@injectable()
export class CrearProductoVeterinario extends CasoDeUsoBase<EntradaCrearProducto, ProductoVeterinario, ComandoCrearProducto> {
  constructor(
    @inject('IRepositorioProductosVeterinario') private readonly repositorioProductos: IRepositorioProductosVeterinario,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaCrearProducto): ComandoCrearProducto {
    const datos = CrearProductoSchema.parse(input.datosCrudos);
    return { ...datos, veterinarioId: input.veterinarioId };
  }

  protected async autorizar(dato: ComandoCrearProducto): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoCrearProducto): Promise<ProductoVeterinario> {
    return this.repositorioProductos.crear(dato.veterinarioId, {
      nombre: dato.nombre,
      descripcion: dato.descripcion,
      precio: dato.precio,
      stock: dato.stock,
    });
  }
}
