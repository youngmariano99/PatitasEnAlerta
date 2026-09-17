import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ListarCursosQuerySchema,
  type ParametrosListarCursos,
} from '@aplicacion/dtos/foros-cursos/ListarCursosDto';
import type { IRepositorioCursos, PaginaCursos } from '@dominio/puertos/IRepositorioCursos';

const TOPE_POR_PAGINA = 50;

export interface EntradaListarCursos {
  datosCrudos: unknown;
}

/**
 * Template Method (CasoDeUsoBase) — listado público paginado de `cursos`
 * (Módulo 8), para que cualquier usuario autenticado pueda elegir a cuál
 * inscribirse. Mismo criterio de `autorizar()` no-op + clamp de paginación
 * en profundidad que `ListarForo`.
 */
@injectable()
export class ListarCursos extends CasoDeUsoBase<
  EntradaListarCursos,
  PaginaCursos,
  ParametrosListarCursos
> {
  constructor(
    @inject('IRepositorioCursos') private readonly repositorioCursos: IRepositorioCursos,
  ) {
    super();
  }

  protected validar(input: EntradaListarCursos): ParametrosListarCursos {
    const datos = ListarCursosQuerySchema.parse(input.datosCrudos);
    return {
      pagina: Math.max(1, Math.trunc(datos.pagina) || 1),
      porPagina: Math.min(
        TOPE_POR_PAGINA,
        Math.max(1, Math.trunc(datos.porPagina) || TOPE_POR_PAGINA),
      ),
    };
  }

  protected async autorizar(): Promise<void> {
    // Sin restricción de rol: cualquier usuario autenticado puede consultar
    // el listado de cursos (docs/ROLES.md, Módulo 8).
  }

  protected async persistir(dato: ParametrosListarCursos): Promise<PaginaCursos> {
    return this.repositorioCursos.listar(dato.pagina, dato.porPagina);
  }
}
