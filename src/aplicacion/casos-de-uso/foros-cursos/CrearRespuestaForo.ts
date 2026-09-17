import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { ZodError } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  CrearRespuestaForoSchema,
  type ComandoCrearRespuestaForo,
} from '@aplicacion/dtos/foros-cursos/RespuestaForoDto';
import type { RespuestaForoListadoDto } from '@aplicacion/dtos/foros-cursos/ListarForoDto';
import type { IRepositorioTemasForo, RespuestaForo } from '@dominio/puertos/IRepositorioTemasForo';
import { ContenidoTemaRequeridoError } from '@dominio/errores/erroresForosCursos';
import { sanitizarDescripcion } from '@infraestructura/seguridad/SanitizadorHtml';

/** Payload crudo del formulario + el tema (del path) + quién responde, resuelto por el route handler desde la sesión. */
export interface EntradaCrearRespuestaForo {
  datosCrudos: unknown;
  temaId: string;
  usuarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — completa "Consulta del foro de bienestar
 * animal" (Módulo 8) con la respuesta que `ListarRespuestasForo` dejaba
 * pendiente: alta de una respuesta a un tema, abierta a cualquier usuario
 * autenticado (docs/ROLES.md, mismo criterio sin restricción de rol que
 * `CrearTemaForo`). Mismo mapeo de `contenido` vacío a PEA-FORO-003, y misma
 * sanitización DOMPurify justo antes de persistir, que `CrearTemaForo`.
 */
@injectable()
export class CrearRespuestaForo extends CasoDeUsoBase<
  EntradaCrearRespuestaForo,
  RespuestaForoListadoDto,
  ComandoCrearRespuestaForo
> {
  constructor(
    @inject('IRepositorioTemasForo') private readonly repositorioTemas: IRepositorioTemasForo,
  ) {
    super();
  }

  protected validar(input: EntradaCrearRespuestaForo): ComandoCrearRespuestaForo {
    try {
      const datos = CrearRespuestaForoSchema.parse(input.datosCrudos);
      return { ...datos, temaId: input.temaId, usuarioId: input.usuarioId };
    } catch (error) {
      if (error instanceof ZodError && String(error.errors[0]?.path[0]) === 'contenido') {
        throw new ContenidoTemaRequeridoError();
      }
      throw error;
    }
  }

  protected async autorizar(): Promise<void> {
    // Sin verificación de rol ni propiedad: cualquier usuario autenticado
    // puede responder un tema del foro (docs/ROLES.md, Módulo 8).
  }

  protected async persistir(dato: ComandoCrearRespuestaForo): Promise<RespuestaForoListadoDto> {
    const respuesta = await this.repositorioTemas.crearRespuesta(
      dato.temaId,
      dato.usuarioId,
      sanitizarDescripcion(dato.contenido) ?? '',
    );
    return this.aDto(respuesta);
  }

  private aDto(respuesta: RespuestaForo): RespuestaForoListadoDto {
    return {
      id: respuesta.id,
      temaId: respuesta.temaId,
      usuarioId: respuesta.usuarioId,
      contenido: respuesta.contenido,
      createdAt: respuesta.createdAt.toISOString(),
    };
  }
}
