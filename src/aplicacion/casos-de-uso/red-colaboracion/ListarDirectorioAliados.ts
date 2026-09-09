import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ListarDirectorioAliadosQuerySchema,
  type ComandoListarDirectorioAliados,
} from '@aplicacion/dtos/red-colaboracion/ListarDirectorioAliadosDto';
import type {
  FiltrosDirectorioAliados,
  IRepositorioDirectorioAliados,
  PaginaDirectorioAliados,
} from '@dominio/puertos/IRepositorioDirectorioAliados';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

/**
 * Roles con acceso de lectura al directorio: todo rol con R(t) sobre
 * `solicitudes_recurso` en docs/ROLES.md (Módulo 5) — organizacion,
 * rescatista, veterinario, municipio, administrador. `dueño`/`comerciante`
 * quedan fuera: ROLES.md no les define ningún permiso sobre este módulo.
 */
const ROLES_CON_ACCESO_AL_DIRECTORIO = ['organizacion', 'veterinario', 'rescatista', 'municipio', 'administrador'];

/** Payload crudo de la query string + quién consulta, resuelto por el route handler desde la sesión. */
export interface EntradaListarDirectorioAliados {
  datosCrudos: unknown;
  usuarioSolicitanteId: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast, tope 50 — mismo
 * criterio que ListarReportes) → autorizar (rol del solicitante entre
 * ROLES_CON_ACCESO_AL_DIRECTORIO, resuelto vía IRepositorioPerfil — mismo
 * criterio anti-IDOR que PublicarSolicitudRecurso: perfil inexistente
 * también rechaza) → persistir (delega el filtro rol/zona + paginación en
 * IRepositorioDirectorioAliados, que además aplica "verificados" de forma no
 * negociable — ver ese puerto). Sin código de error propio en
 * docs/ERRORS.md para el rechazo de acceso; reutiliza el transversal
 * PEA-SIS-002, mismo criterio documentado en PublicarSolicitudRecurso.ts.
 */
@injectable()
export class ListarDirectorioAliados extends CasoDeUsoBase<
  EntradaListarDirectorioAliados,
  PaginaDirectorioAliados,
  ComandoListarDirectorioAliados
> {
  constructor(
    @inject('IRepositorioDirectorioAliados') private readonly repositorioDirectorio: IRepositorioDirectorioAliados,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaListarDirectorioAliados): ComandoListarDirectorioAliados {
    const datos = ListarDirectorioAliadosQuerySchema.parse(input.datosCrudos);
    return { ...datos, usuarioSolicitanteId: input.usuarioSolicitanteId };
  }

  protected async autorizar(dato: ComandoListarDirectorioAliados): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.usuarioSolicitanteId);
    if (!solicitante || !ROLES_CON_ACCESO_AL_DIRECTORIO.includes(solicitante.rol)) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarDirectorioAliados): Promise<PaginaDirectorioAliados> {
    const filtros: FiltrosDirectorioAliados = {
      rol: dato.rol,
      zona:
        dato.latitud !== undefined && dato.longitud !== undefined && dato.radioKm !== undefined
          ? { latitud: dato.latitud, longitud: dato.longitud, radioKm: dato.radioKm }
          : undefined,
    };

    return this.repositorioDirectorio.listar(filtros, dato.pagina, dato.porPagina);
  }
}
