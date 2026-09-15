import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioTemasForo } from '@dominio/puertos/IRepositorioTemasForo';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { TemaForoNoEncontradoError } from '@dominio/errores/erroresForosCursos';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_AUTORIZADO = 'administrador';

export interface ComandoModerarTema {
  temaId: string;
  usuarioId: string;
}

export interface TemaModerado {
  id: string;
}

/**
 * Template Method (CasoDeUsoBase) — moderación de un tema del foro (Módulo
 * 8, Paso 2: soft delete restringido a `rol_actual()='administrador'`, AC
 * explícito del ticket — "usuario con rol distinto a administrador → 403").
 * Sin lectura previa del tema en `autorizar()` (a diferencia de
 * `EditarTemaForo`, que sí necesita comparar pertenencia): la moderación no
 * depende de quién sea el autor, solo del rol de quien la ejecuta, así que
 * el único punto de verdad sobre si el tema existe es el propio UPDATE
 * condicionado en `persistir()` — mismo criterio de "nunca confiar en una
 * lectura previa" que `DarDeBajaProductoComercio`.
 */
@injectable()
export class ModerarTemaCommand extends CasoDeUsoBase<ComandoModerarTema, TemaModerado> {
  constructor(
    @inject('IRepositorioTemasForo') private readonly repositorioTemas: IRepositorioTemasForo,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: ComandoModerarTema): ComandoModerarTema {
    return input;
  }

  protected async autorizar(dato: ComandoModerarTema): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.usuarioId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoModerarTema): Promise<TemaModerado> {
    const moderado = await this.repositorioTemas.moderar(dato.temaId);
    if (!moderado) {
      throw new TemaForoNoEncontradoError();
    }
    return { id: dato.temaId };
  }
}
