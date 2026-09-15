import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioProductosVeterinario, PaginaProductos } from '@dominio/puertos/IRepositorioProductosVeterinario';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_AUTORIZADO = 'veterinario';

export interface ComandoListarMisProductos {
  veterinarioId: string;
  pagina: number;
  porPagina: number;
}

/**
 * Template Method (CasoDeUsoBase) — catálogo propio de gestión (Módulo 6,
 * Paso 1: "R" del CRUD, vista del veterinario sobre sus propios productos,
 * incluidos los agotados). `autorizar()` exige rol `veterinario`, mismo
 * criterio que `CrearProductoVeterinario`.
 */
@injectable()
export class ListarMisProductos extends CasoDeUsoBase<ComandoListarMisProductos, PaginaProductos> {
  constructor(
    @inject('IRepositorioProductosVeterinario') private readonly repositorioProductos: IRepositorioProductosVeterinario,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: ComandoListarMisProductos): ComandoListarMisProductos {
    return input;
  }

  protected async autorizar(dato: ComandoListarMisProductos): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarMisProductos): Promise<PaginaProductos> {
    return this.repositorioProductos.listarPropios(dato.veterinarioId, dato.pagina, dato.porPagina);
  }
}
