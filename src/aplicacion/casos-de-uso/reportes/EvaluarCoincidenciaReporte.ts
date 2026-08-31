import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import type { ReporteCreado } from '@aplicacion/dtos/reportes/CrearReporteDto';
import type { IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { logger } from '@infraestructura/logging/logger';

/** Radio de búsqueda de coincidencias, en kilómetros — regla simple del MVP (docs/PLANIFICACION.md, REP-U-06). */
const RADIO_COINCIDENCIA_KM = 5;

/**
 * Strategy/Command invocado por CrearReporte.publicarEvento() únicamente
 * cuando `tipo === 'encontrado'`: evalúa reportes 'perdido' activos en la
 * misma zona (radio de RADIO_COINCIDENCIA_KM) y especie, y notifica
 * (`tipo: 'reporte_coincidente'`, ya contemplado en el CHECK de
 * `notificaciones` — docs/SCHEMA.md) a cada dueño que reportó una de esas
 * coincidencias.
 *
 * Sin `especie` no hay coincidencia posible que respete el criterio zona+especie
 * de REP-U-06 (buscar solo por zona daría falsos positivos entre especies
 * distintas) — en ese caso no se ejecuta ninguna búsqueda.
 */
@injectable()
export class EvaluarCoincidenciaReporte {
  constructor(
    @inject('IRepositorioReportes') private readonly repositorioReportes: IRepositorioReportes,
    @inject('INotificacionesRepositorio') private readonly repositorioNotificaciones: INotificacionesRepositorio,
  ) {}

  async ejecutar(reporteEncontrado: ReporteCreado): Promise<void> {
    if (!reporteEncontrado.especie) {
      logger.info(
        { reporteId: reporteEncontrado.id },
        'Reporte "encontrado" sin especie declarada — se omite la búsqueda de coincidencias',
      );
      return;
    }

    const coincidencias = await this.repositorioReportes.buscarPerdidosActivosPorZonaYEspecie({
      especie: reporteEncontrado.especie,
      latitud: reporteEncontrado.latitud,
      longitud: reporteEncontrado.longitud,
      radioKm: RADIO_COINCIDENCIA_KM,
      excluirReporteId: reporteEncontrado.id,
    });

    for (const perdido of coincidencias) {
      await this.repositorioNotificaciones.crear({
        usuarioId: perdido.reportadoPor,
        tipo: 'reporte_coincidente',
        referenciaTabla: 'reportes',
        referenciaId: reporteEncontrado.id,
      });
    }

    logger.info(
      { reporteId: reporteEncontrado.id, coincidencias: coincidencias.length },
      'Evaluación de coincidencias completada',
    );
  }
}
