import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { ListarTemasForoQuerySchema, type ParametrosListarTemasForo } from '@aplicacion/dtos/foros-cursos/ListarForoDto';
import type { IRepositorioTemasForo, PaginaTemasForo } from '@dominio/puertos/IRepositorioTemasForo';

const TOPE_POR_PAGINA = 50;

/** Payload crudo de la query string, resuelto por el route handler desde `request.nextUrl.searchParams`. */
export interface EntradaListarForo {
  datosCrudos: unknown;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Consulta del foro de bienestar
 * animal" (Módulo 8, Paso 1: listado paginado — tope 50, server-side — de
 * `temas_foro`, para cualquier usuario autenticado). `autorizar()` es un
 * no-op real: a diferencia de `ListarReportes` (público, sin login), acá SÍ
 * se exige sesión activa, pero sin restricción de rol — la verificación de
 * "hay sesión" ya ocurre en el route handler (`obtenerUsuarioAutenticado`)
 * antes de resolver este caso de uso, mismo criterio que `CrearTemaForo`.
 *
 * `validar()` clampea `pagina`/`porPagina` con el mismo criterio de defensa
 * en profundidad que `ListarReportes` (el tope de 50 ya está en el Schema
 * de la query, pero se refuerza acá por si el caso de uso se invoca desde
 * otro lugar en el futuro). `persistir()` delega el filtro de temas activos
 * (`deletedAt IS NULL` — un tema moderado no aparece en este listado
 * público) + paginación en `IRepositorioTemasForo.listar`, nunca arma la
 * query acá.
 */
@injectable()
export class ListarForo extends CasoDeUsoBase<EntradaListarForo, PaginaTemasForo, ParametrosListarTemasForo> {
  constructor(@inject('IRepositorioTemasForo') private readonly repositorioTemas: IRepositorioTemasForo) {
    super();
  }

  protected validar(input: EntradaListarForo): ParametrosListarTemasForo {
    const datos = ListarTemasForoQuerySchema.parse(input.datosCrudos);
    return {
      pagina: Math.max(1, Math.trunc(datos.pagina) || 1),
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(datos.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(): Promise<void> {
    // Sin restricción de rol: cualquier usuario autenticado puede consultar
    // el foro (docs/ROLES.md, Módulo 8). La exigencia de sesión activa ya
    // ocurre en el route handler.
  }

  protected async persistir(dato: ParametrosListarTemasForo): Promise<PaginaTemasForo> {
    return this.repositorioTemas.listar(dato.pagina, dato.porPagina);
  }
}
