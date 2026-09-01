import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ParametrosListarFichasAdopcion } from '@aplicacion/dtos/municipio/FichaAdopcionDto';
import type { IRepositorioFichasAdopcion, PaginaFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';

const ROLES_AUTORIZADOS = ['municipio', 'administrador'];
const TOPE_POR_PAGINA = 50;

/** Filtros de la query + quién consulta, resuelto por el route handler desde la sesión. */
export interface EntradaListarFichasAdopcion extends ParametrosListarFichasAdopcion {
  municipioId: string;
}

/**
 * Panel municipal de la vitrina de adopción: a diferencia de la vitrina
 * pública (Post-MVP, fuera de esta actividad — RLS `vitrina_select_publico`
 * solo muestra `estado='disponible'` a un visitante anónimo), acá el propio
 * municipio ve TODAS sus fichas sin importar el estado ('disponible',
 * 'adoptado', 'baja'), autorizado por rol (PEA-MUN-005) igual que el resto
 * de esta actividad — la RLS `vitrina_crud_municipio` ya lo permite vía
 * `municipio_id = auth.uid()`.
 */
@injectable()
export class ListarFichasAdopcion extends CasoDeUsoBase<EntradaListarFichasAdopcion, PaginaFichasAdopcion> {
  constructor(
    @inject('IRepositorioFichasAdopcion') private readonly repositorioFichas: IRepositorioFichasAdopcion,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaListarFichasAdopcion): EntradaListarFichasAdopcion {
    return {
      ...input,
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(dato: EntradaListarFichasAdopcion): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.municipioId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new SoloMunicipioAdministraEventosError();
    }
  }

  protected async persistir(dato: EntradaListarFichasAdopcion): Promise<PaginaFichasAdopcion> {
    return this.repositorioFichas.listarPorMunicipio(
      { municipioId: dato.municipioId, estado: dato.estado },
      dato.pagina,
      dato.porPagina,
    );
  }
}
