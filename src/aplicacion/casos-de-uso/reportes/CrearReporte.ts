import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { crearPipelineValidacionReporte } from '@aplicacion/pipelines/ValidacionReporte';
import type { ComandoCrearReporte, ReporteCreado } from '@aplicacion/dtos/reportes/CrearReporteDto';
import type { IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import { logger } from '@infraestructura/logging/logger';

/** Payload crudo del formulario + quién reporta, resuelto por el route handler desde la sesión. */
export interface EntradaCrearReporte {
  datosCrudos: unknown;
  reportadoPor: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (delega en el pipeline Chain of
 * Responsibility de ValidacionReporte.ts: esquema → rate limit → contenido
 * de imagen → geolocalización) → autorizar (no-op: cualquier usuario
 * autenticado puede reportar, sin verificación de propiedad de por medio) →
 * persistir (insert en `reportes` con `estado='reportado'`, ver
 * IRepositorioReportes) → publicarEvento (Observer: emite `ReporteCreado`).
 */
@injectable()
export class CrearReporte extends CasoDeUsoBase<EntradaCrearReporte, ReporteCreado, ComandoCrearReporte> {
  constructor(
    @inject('IRepositorioReportes') private readonly repositorioReportes: IRepositorioReportes,
    @inject('IAlmacenamientoImagenes') private readonly almacenamientoImagenes: IAlmacenamientoImagenes,
    @inject('IControlDeTasa') private readonly controlDeTasa: IControlDeTasa,
  ) {
    super();
  }

  protected async validar(input: EntradaCrearReporte): Promise<ComandoCrearReporte> {
    const pipeline = crearPipelineValidacionReporte({
      controlDeTasa: this.controlDeTasa,
      almacenamientoImagenes: this.almacenamientoImagenes,
    });
    return pipeline.manejar({ datosCrudos: input.datosCrudos, reportadoPor: input.reportadoPor }, input.datosCrudos);
  }

  protected async autorizar(): Promise<void> {
    // Sin verificación de propiedad: a diferencia de mascotas/libreta
    // sanitaria, cualquier usuario autenticado puede reportar (la
    // pertenencia opcional a `mascotaId` no exige ser su dueño — un vecino
    // puede reportar como "encontrado" la mascota de otra persona).
  }

  protected async persistir(dato: ComandoCrearReporte): Promise<ReporteCreado> {
    const reporte = await this.repositorioReportes.crear({
      tipo: dato.tipo,
      subtipo: null,
      reportadoPor: dato.reportadoPor,
      mascotaId: dato.mascotaId ?? null,
      descripcion: dato.descripcion,
      fotoUrl: dato.fotoUrl,
      latitud: dato.latitud,
      longitud: dato.longitud,
    });

    return {
      id: reporte.id,
      tipo: reporte.tipo,
      reportadoPor: reporte.reportadoPor,
      mascotaId: reporte.mascotaId,
      descripcion: reporte.descripcion,
      fotoUrl: reporte.fotoUrl,
      latitud: reporte.latitud,
      longitud: reporte.longitud,
      estado: reporte.estado,
      createdAt: reporte.createdAt.toISOString(),
    };
  }

  protected override async publicarEvento(resultado: ReporteCreado): Promise<void> {
    // Todavía no existe un consumidor real del evento (ej. matching contra
    // reportes 'encontrado' — Módulo 5/9 post-MVP). Se emite igual, vía
    // logging estructurado (mismo transporte que el resto del proyecto usa
    // para trazabilidad — ver CasoDeUsoBase), para que un listener futuro
    // pueda engancharse sin tocar CrearReporte otra vez.
    logger.info({ evento: 'ReporteCreado', reporteId: resultado.id, tipo: resultado.tipo }, 'Evento de dominio publicado');
  }
}
