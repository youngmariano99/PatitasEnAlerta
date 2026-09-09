import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  PublicarSolicitudRecursoSchema,
  type ComandoPublicarSolicitudRecurso,
  type SolicitudRecursoPublicada,
} from '@aplicacion/dtos/red-colaboracion/PublicarSolicitudRecursoDto';
import type { IRepositorioSolicitudesRecurso } from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

const ROL_AUTORIZADO = 'organizacion';

/** Payload crudo del formulario de publicación + quién publica, resuelto por el route handler desde la sesión. */
export interface EntradaPublicarSolicitudRecurso {
  datosCrudos: unknown;
  organizacionId: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast) → autorizar (rol
 * `organizacion` exclusivamente — docs/ROLES.md matriz de Módulo 5:
 * `solicitudes_recurso` es `CRUD(p)` únicamente para `organizacion`, ni
 * siquiera `administrador` tiene alta ahí, a diferencia de CrearEvento; sin
 * código de error propio en docs/ERRORS.md para este caso puntual, así que
 * se reutiliza el transversal PEA-SIS-002 — ver docs/DECISIONES.md) →
 * persistir (insert en `solicitudes_recurso` con
 * `organizacion_id = usuario_actual()`, `estado` inicial `'abierta'` por
 * default de columna, docs/SCHEMA.md) → publicarEvento (Observer: loguea
 * `SolicitudRecursoPublicada`).
 */
@injectable()
export class PublicarSolicitudRecurso extends CasoDeUsoBase<
  EntradaPublicarSolicitudRecurso,
  SolicitudRecursoPublicada,
  ComandoPublicarSolicitudRecurso
> {
  constructor(
    @inject('IRepositorioSolicitudesRecurso') private readonly repositorioSolicitudes: IRepositorioSolicitudesRecurso,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaPublicarSolicitudRecurso): ComandoPublicarSolicitudRecurso {
    const datos = PublicarSolicitudRecursoSchema.parse(input.datosCrudos);
    return { ...datos, organizacionId: input.organizacionId };
  }

  protected async autorizar(dato: ComandoPublicarSolicitudRecurso): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.organizacionId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoPublicarSolicitudRecurso): Promise<SolicitudRecursoPublicada> {
    const solicitud = await this.repositorioSolicitudes.crear({
      organizacionId: dato.organizacionId,
      tipo: dato.tipo,
      descripcion: dato.descripcion,
      reporteId: dato.reporteId ?? null,
    });

    return {
      id: solicitud.id,
      organizacionId: solicitud.organizacionId,
      tipo: solicitud.tipo,
      descripcion: solicitud.descripcion,
      reporteId: solicitud.reporteId,
      estado: solicitud.estado,
      createdAt: solicitud.createdAt.toISOString(),
    };
  }

  protected override async publicarEvento(resultado: SolicitudRecursoPublicada): Promise<void> {
    logger.info(
      {
        evento: 'SolicitudRecursoPublicada',
        solicitudId: resultado.id,
        organizacionId: resultado.organizacionId,
        tipo: resultado.tipo,
      },
      'Evento de dominio publicado',
    );
  }
}
