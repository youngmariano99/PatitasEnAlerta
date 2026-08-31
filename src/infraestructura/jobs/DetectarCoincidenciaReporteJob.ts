import 'reflect-metadata';
import { injectable } from 'tsyringe';
import type { ReporteCreado } from '@aplicacion/dtos/reportes/CrearReporteDto';
import { EvaluarCoincidenciaReporte } from '@aplicacion/casos-de-uso/reportes/EvaluarCoincidenciaReporte';
import { logger } from '@infraestructura/logging/logger';

/**
 * Job de infraestructura que despacha EvaluarCoincidenciaReporte (la
 * consulta 'perdido' activo × zona/especie + el INSERT en `notificaciones`,
 * REP-U-06) SIN que CrearReporte.publicarEvento() lo espere. Es lo único
 * que hace este archivo: EvaluarCoincidenciaReporte conserva toda la lógica
 * de negocio (dónde vive el radio configurado, qué cuenta como coincidencia,
 * qué se inserta) — este job es puro despacho asincrónico.
 *
 * Por qué `void` en vez de `await` es seguro acá (y no lo sería en todos
 * lados): este proyecto corre como un proceso Node.js de larga duración
 * (Dockerfile → `next start`, no funciones serverless de Vercel con
 * ejecución cortada al responder). Una promesa no esperada sigue
 * ejecutándose en el mismo event loop después de que el route handler ya
 * envió la respuesta HTTP — nunca se pierde ni se corta a mitad de camino.
 * Si el proyecto migrara a un runtime serverless, este `programar()` tendría
 * que cambiar a algo que sobreviva el fin del request (cola real, o
 * `after()`/`waitUntil()` de la plataforma).
 */
@injectable()
export class DetectarCoincidenciaReporteJob {
  constructor(private readonly evaluarCoincidencia: EvaluarCoincidenciaReporte) {}

  /**
   * Dispara la detección de coincidencias para un reporte recién creado y
   * devuelve el control inmediatamente — nunca hay que hacer `await` de este
   * método (por diseño no devuelve una Promise). Los errores del job nunca
   * deben llegarle al llamador: un fallo acá es un incidente de
   * observabilidad, jamás un motivo para que la respuesta HTTP de "reporte
   * creado" (que ya se envió) se vea afectada.
   */
  programar(reporteEncontrado: ReporteCreado): void {
    this.evaluarCoincidencia.ejecutar(reporteEncontrado).catch((error: unknown) => {
      logger.error(
        { err: error, reporteId: reporteEncontrado.id },
        'DetectarCoincidenciaReporteJob: no se pudo completar la detección de coincidencias',
      );
    });
  }
}
