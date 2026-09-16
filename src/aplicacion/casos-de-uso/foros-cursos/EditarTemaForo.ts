import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { ZodError } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  EditarTemaForoSchema,
  type DatosEditarTemaForoDto,
  type TemaForoDto,
} from '@aplicacion/dtos/foros-cursos/TemaForoDto';
import type { IRepositorioTemasForo, TemaForoActual } from '@dominio/puertos/IRepositorioTemasForo';
import { ContenidoTemaRequeridoError, TemaForoModeradoError, TemaForoNoEncontradoError } from '@dominio/errores/erroresForosCursos';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { sanitizarDescripcion } from '@infraestructura/seguridad/SanitizadorHtml';

/** Payload crudo del cliente + el tema a editar + quién edita, resuelto por el route handler desde la ruta/sesión. */
export interface EntradaEditarTemaForo {
  datosCrudos: unknown;
  temaId: string;
  usuarioId: string;
}

/** El comando ya validado, con el tema actual adjunto — `autorizar()` lo necesita sin volver a consultarlo. */
interface ComandoEditarTemaForoValidado extends DatosEditarTemaForoDto {
  temaId: string;
  usuarioId: string;
  actual: TemaForoActual;
}

/**
 * Template Method (CasoDeUsoBase) — edición de un tema propio (Módulo 8,
 * Paso 3: bloqueada si el tema ya fue moderado por un Administrador, AC
 * explícito del ticket). Mismo esqueleto de tres pasos que
 * `ActualizarProductoComercio`: `validar()` hace la única lectura del tema
 * (Zod + `obtenerActual`, 404/PEA-FORO-002 si el id nunca existió);
 * `autorizar()` reutiliza ese tema ya leído — primero pertenencia
 * (PEA-SIS-002 si no es el autor), después moderación (PEA-FORO-004 si ya
 * fue soft-deleted por un Administrador; se chequea después de pertenencia
 * para no revelar el estado de moderación de un tema ajeno). `persistir()`
 * nunca confía en esa lectura para decidir éxito/fracaso: el UPDATE
 * condicionado por `id` + `creadoPor` + `deletedAt IS NULL` es la última
 * palabra — si la carrera hace que el tema se modere entre `autorizar()` y
 * `persistir()`, el UPDATE no matchea ninguna fila y se relanza el mismo
 * PEA-FORO-004.
 */
@injectable()
export class EditarTemaForo extends CasoDeUsoBase<EntradaEditarTemaForo, TemaForoDto, ComandoEditarTemaForoValidado> {
  constructor(@inject('IRepositorioTemasForo') private readonly repositorioTemas: IRepositorioTemasForo) {
    super();
  }

  protected async validar(input: EntradaEditarTemaForo): Promise<ComandoEditarTemaForoValidado> {
    let datos: DatosEditarTemaForoDto;
    try {
      datos = EditarTemaForoSchema.parse(input.datosCrudos);
    } catch (error) {
      throw this.aErrorDeNegocio(error);
    }

    const actual = await this.repositorioTemas.obtenerActual(input.temaId);
    if (!actual) {
      throw new TemaForoNoEncontradoError();
    }

    return { ...datos, temaId: input.temaId, usuarioId: input.usuarioId, actual };
  }

  private aErrorDeNegocio(error: unknown): unknown {
    if (error instanceof ZodError && ['titulo', 'contenido'].includes(String(error.errors[0]?.path[0]))) {
      return new ContenidoTemaRequeridoError();
    }
    return error;
  }

  protected async autorizar(dato: ComandoEditarTemaForoValidado): Promise<void> {
    if (dato.actual.creadoPor !== dato.usuarioId) {
      throw new AccesoNoAutorizadoError();
    }
    if (dato.actual.moderado) {
      throw new TemaForoModeradoError();
    }
  }

  protected async persistir(dato: ComandoEditarTemaForoValidado): Promise<TemaForoDto> {
    const actualizado = await this.repositorioTemas.actualizar(dato.temaId, dato.usuarioId, {
      titulo: sanitizarDescripcion(dato.titulo) ?? '',
      contenido: sanitizarDescripcion(dato.contenido) ?? '',
    });
    if (!actualizado) {
      throw new TemaForoModeradoError();
    }

    return {
      id: actualizado.id,
      creadoPor: actualizado.creadoPor,
      titulo: actualizado.titulo,
      contenido: actualizado.contenido,
      createdAt: actualizado.createdAt.toISOString(),
    };
  }
}
