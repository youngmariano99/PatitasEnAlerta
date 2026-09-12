import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  BuscarReportesSimilaresQuerySchema,
  type ComandoBuscarReportesSimilares,
} from '@aplicacion/dtos/red-colaboracion/BuscarReportesSimilaresDto';
import type { CriteriosBusquedaSemantica, IRepositorioReportes, ReporteSimilar } from '@dominio/puertos/IRepositorioReportes';
import type { IGeneradorEmbeddings } from '@dominio/puertos/IGeneradorEmbeddings';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

/**
 * Mismo conjunto de roles que ListarDirectorioAliados.ts (Red de
 * Colaboración, Módulo 5): `reportes` en sí es R(t) también para
 * dueño/comerciante/Público (docs/ROLES.md, Módulo 2) vía GET /api/reportes,
 * pero esta búsqueda híbrida es una capacidad propia del módulo de Red de
 * Colaboración (vive bajo /api/red-colaboracion, protegido en
 * middleware.ts) — no reemplaza ni restringe el listado público existente.
 */
const ROLES_CON_ACCESO_A_BUSQUEDA_SEMANTICA = ['organizacion', 'veterinario', 'rescatista', 'municipio', 'administrador'];

/** Payload crudo de la query string + quién consulta, resuelto por el route handler desde la sesión. */
export interface EntradaBuscarReportesSimilares {
  datosCrudos: unknown;
  usuarioSolicitanteId: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast, `consulta`
 * obligatoria, tope 20 resultados) → autorizar (rol del solicitante, mismo
 * criterio anti-IDOR que ListarDirectorioAliados: perfil inexistente también
 * rechaza) → persistir (genera el embedding de `consulta` vía
 * IGeneradorEmbeddings y delega la búsqueda híbrida — similitud coseno +
 * filtros exactos — en IRepositorioReportes.buscarPorSimilitudSemantica).
 * Sin código de error propio en docs/ERRORS.md para el rechazo de acceso;
 * reutiliza el transversal PEA-SIS-002, mismo criterio que
 * ListarDirectorioAliados/PublicarSolicitudRecurso.
 */
@injectable()
export class BuscarReportesSimilares extends CasoDeUsoBase<
  EntradaBuscarReportesSimilares,
  ReporteSimilar[],
  ComandoBuscarReportesSimilares
> {
  constructor(
    @inject('IRepositorioReportes') private readonly repositorioReportes: IRepositorioReportes,
    @inject('IGeneradorEmbeddings') private readonly generadorEmbeddings: IGeneradorEmbeddings,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaBuscarReportesSimilares): ComandoBuscarReportesSimilares {
    const datos = BuscarReportesSimilaresQuerySchema.parse(input.datosCrudos);
    return { ...datos, usuarioSolicitanteId: input.usuarioSolicitanteId };
  }

  protected async autorizar(dato: ComandoBuscarReportesSimilares): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.usuarioSolicitanteId);
    if (!solicitante || !ROLES_CON_ACCESO_A_BUSQUEDA_SEMANTICA.includes(solicitante.rol)) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoBuscarReportesSimilares): Promise<ReporteSimilar[]> {
    const vectorConsulta = await this.generadorEmbeddings.generarEmbedding(dato.consulta);

    const criterios: CriteriosBusquedaSemantica = {
      vectorConsulta,
      tipo: dato.tipo,
      estado: dato.estado,
      especie: dato.especie,
      zona:
        dato.latitud !== undefined && dato.longitud !== undefined && dato.radioKm !== undefined
          ? { latitud: dato.latitud, longitud: dato.longitud, radioKm: dato.radioKm }
          : undefined,
      limite: dato.limite,
    };

    return this.repositorioReportes.buscarPorSimilitudSemantica(criterios);
  }
}
