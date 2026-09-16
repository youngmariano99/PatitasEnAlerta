import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { ZodError } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { PublicarTemaForoSchema, type ComandoCrearTemaForo, type TemaForoDto } from '@aplicacion/dtos/foros-cursos/TemaForoDto';
import type { IRepositorioTemasForo, TemaForo } from '@dominio/puertos/IRepositorioTemasForo';
import { ContenidoTemaRequeridoError } from '@dominio/errores/erroresForosCursos';
import { sanitizarDescripcion } from '@infraestructura/seguridad/SanitizadorHtml';

/** Payload crudo del formulario + quién publica, resuelto por el route handler desde la sesión. */
export interface EntradaCrearTemaForo {
  datosCrudos: unknown;
  usuarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Publicación de contenido
 * educativo en el foro" (Módulo 8, Paso 1: alta abierta a cualquier usuario
 * autenticado, docs/ROLES.md Patrón B — sin recurso propio previo que
 * resolver, mismo criterio de `autorizar()` no-op que `CrearReporte`).
 * `validar()` mapea `titulo`/`contenido` vacíos a PEA-FORO-003 (docs/ERRORS.md
 * lo marca explícitamente como capa "Aplicación, Zod", no el PEA-SIS-005
 * genérico) — mismo patrón que `ConfigurarDisponibilidad.aErrorDeNegocio`.
 * `persistir()` sanitiza `titulo`/`contenido` con DOMPurify (Paso 1, AC
 * explícito: "al guardar y al renderizar") justo antes de persistir.
 */
@injectable()
export class CrearTemaForo extends CasoDeUsoBase<EntradaCrearTemaForo, TemaForoDto, ComandoCrearTemaForo> {
  constructor(@inject('IRepositorioTemasForo') private readonly repositorioTemas: IRepositorioTemasForo) {
    super();
  }

  protected validar(input: EntradaCrearTemaForo): ComandoCrearTemaForo {
    try {
      const datos = PublicarTemaForoSchema.parse(input.datosCrudos);
      return { ...datos, usuarioId: input.usuarioId };
    } catch (error) {
      throw this.aErrorDeNegocio(error);
    }
  }

  private aErrorDeNegocio(error: unknown): unknown {
    if (error instanceof ZodError && ['titulo', 'contenido'].includes(String(error.errors[0]?.path[0]))) {
      return new ContenidoTemaRequeridoError();
    }
    return error;
  }

  protected async autorizar(): Promise<void> {
    // Sin verificación de rol ni propiedad: cualquier usuario autenticado
    // puede publicar un tema (docs/ROLES.md, Módulo 8 — "Cualquier
    // autenticado: CRUD(p)").
  }

  protected async persistir(dato: ComandoCrearTemaForo): Promise<TemaForoDto> {
    const tema = await this.repositorioTemas.crear(dato.usuarioId, {
      titulo: sanitizarDescripcion(dato.titulo) ?? '',
      contenido: sanitizarDescripcion(dato.contenido) ?? '',
    });

    return this.aDto(tema);
  }

  private aDto(tema: TemaForo): TemaForoDto {
    return {
      id: tema.id,
      creadoPor: tema.creadoPor,
      titulo: tema.titulo,
      contenido: tema.contenido,
      createdAt: tema.createdAt.toISOString(),
    };
  }
}
