import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { PaginaEntradasLibretaDto } from '@aplicacion/dtos/veterinarios/ListarLibretaSanitariaDto';
import type { IRepositorioEntradasLibreta } from '@dominio/puertos/IRepositorioEntradasLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const TOPE_POR_PAGINA = 50;

export interface ComandoListarLibretaSanitaria {
  mascotaId: string;
  dueñoId: string;
  pagina: number;
  porPagina: number;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Consulta del historial de la
 * libreta sanitaria" (Módulo 4): historial cronológico completo (entradas de
 * cualquier veterinario que haya escrito en la mascota), paginado (tope 50,
 * docs/REQUISITOS.md NFR de paginación server-side), más reciente primero.
 * Exclusivo del dueño de esa mascota puntual — `autorizar()` repite el mismo
 * chequeo de pertenencia que `ListarAutorizacionesLibreta.ts` (anti-IDOR):
 * sin él, cualquier usuario autenticado podría leer la libreta de la mascota
 * de otro dueño con solo adivinar su id.
 */
@injectable()
export class ListarLibretaSanitaria extends CasoDeUsoBase<ComandoListarLibretaSanitaria, PaginaEntradasLibretaDto> {
  constructor(
    @inject('IRepositorioEntradasLibreta') private readonly repositorioEntradas: IRepositorioEntradasLibreta,
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
  ) {
    super();
  }

  protected validar(input: ComandoListarLibretaSanitaria): ComandoListarLibretaSanitaria {
    return {
      ...input,
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(dato: ComandoListarLibretaSanitaria): Promise<void> {
    const mascota = await this.repositorioMascotas.buscarPorId(dato.mascotaId);
    if (!mascota) {
      throw new MascotaNoEncontradaError();
    }
    if (mascota.dueñoId !== dato.dueñoId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarLibretaSanitaria): Promise<PaginaEntradasLibretaDto> {
    const pagina = await this.repositorioEntradas.listarPorMascota(dato.mascotaId, dato.pagina, dato.porPagina);
    return {
      items: pagina.items.map((entrada) => ({
        id: entrada.id,
        mascotaId: entrada.mascotaId,
        veterinarioId: entrada.veterinarioId,
        tipo: entrada.tipo,
        descripcion: entrada.descripcion,
        fecha: entrada.fecha,
        createdAt: entrada.createdAt.toISOString(),
      })),
      total: pagina.total,
      pagina: pagina.pagina,
      porPagina: pagina.porPagina,
    };
  }
}
