import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { crearPipelineValidacionReporte } from '@aplicacion/pipelines/ValidacionReporte';
import type { ComandoCrearReporte, ReporteCreado } from '@aplicacion/dtos/reportes/CrearReporteDto';
import type { IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import { DetectarCoincidenciaReporteJob } from '@infraestructura/jobs/DetectarCoincidenciaReporteJob';
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
 * IRepositorioReportes) → publicarEvento (Observer: emite `ReporteCreado` y,
 * cuando `tipo === 'encontrado'`, programa DetectarCoincidenciaReporteJob —
 * SIN esperarlo: el job corre asincrónico respecto de esta respuesta HTTP,
 * ver DetectarCoincidenciaReporteJob.ts).
 *
 * Un único caso de uso cubre REP-01 (mascota perdida), REP-02 (mascota
 * encontrada) y REP-03 (problemática urbana): `tipo` es el parámetro que
 * cambia entre los tres flujos — ver CrearReporteDto, TIPOS_REPORTE_SOPORTADOS.
 * La única rama de código específica por tipo vive en `persistir()` (forzar
 * `mascotaId=null` en 'problematica') y en `publicarEvento()` (qué evento
 * dispara cada tipo) — todo lo demás (validar, autorizar) es idéntico.
 */
@injectable()
export class CrearReporte extends CasoDeUsoBase<EntradaCrearReporte, ReporteCreado, ComandoCrearReporte> {
  constructor(
    @inject('IRepositorioReportes') private readonly repositorioReportes: IRepositorioReportes,
    @inject('IAlmacenamientoImagenes') private readonly almacenamientoImagenes: IAlmacenamientoImagenes,
    @inject('IControlDeTasa') private readonly controlDeTasa: IControlDeTasa,
    private readonly detectarCoincidenciaJob: DetectarCoincidenciaReporteJob,
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
    // puede reportar como "encontrado" la mascota de otra persona, sin
    // siquiera tener una mascota propia registrada).
  }

  protected async persistir(dato: ComandoCrearReporte): Promise<ReporteCreado> {
    const esProblematica = dato.tipo === 'problematica';

    const reporte = await this.repositorioReportes.crear({
      tipo: dato.tipo,
      // `subtipo` solo tiene sentido para 'problematica' (ValidadorEsquemaZod
      // ya lo exigió ahí vía superRefine); para 'perdido'/'encontrado' se
      // ignora aunque el cliente lo haya enviado.
      subtipo: esProblematica ? (dato.subtipo ?? null) : null,
      reportadoPor: dato.reportadoPor,
      // Una problemática urbana nunca está vinculada a una mascota
      // registrada — se fuerza null acá aunque el cliente declare
      // mascotaId, defensa en profundidad más allá de lo que ya impide la UI.
      mascotaId: esProblematica ? null : dato.mascotaId ?? null,
      descripcion: dato.descripcion,
      fotoUrl: dato.fotoUrl,
      latitud: dato.latitud,
      longitud: dato.longitud,
      especie: dato.especie ?? null,
    });

    return {
      id: reporte.id,
      tipo: reporte.tipo,
      subtipo: reporte.subtipo,
      reportadoPor: reporte.reportadoPor,
      mascotaId: reporte.mascotaId,
      descripcion: reporte.descripcion,
      fotoUrl: reporte.fotoUrl,
      latitud: reporte.latitud,
      longitud: reporte.longitud,
      especie: reporte.especie,
      estado: reporte.estado,
      createdAt: reporte.createdAt.toISOString(),
    };
  }

  protected override async publicarEvento(resultado: ReporteCreado): Promise<void> {
    logger.info({ evento: 'ReporteCreado', reporteId: resultado.id, tipo: resultado.tipo }, 'Evento de dominio publicado');

    if (resultado.tipo !== 'encontrado') return;

    // Deliberadamente sin `await`: el job (y sus propios errores, que
    // maneja internamente) no debe retrasar ni afectar esta respuesta HTTP
    // — ver DetectarCoincidenciaReporteJob.ts para el porqué es seguro acá.
    this.detectarCoincidenciaJob.programar(resultado);
  }
}
