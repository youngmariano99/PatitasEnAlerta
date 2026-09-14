import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import type { IRepositorioTurnos } from '@dominio/puertos/IRepositorioTurnos';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { logger } from '@infraestructura/logging/logger';

/** Cuánto antes de `franja_inicio` se avisa (docs/DECISIONES.md: valor no especificado por el ticket, completado a favor de la Historia "recordatorios de turnos próximos"). */
const VENTANA_RECORDATORIO_HORAS = 24;

/** `notificaciones.tipo` — docs/SCHEMA.md. */
const TIPO_NOTIFICACION_RECORDATORIO = 'turno_recordatorio';
const REFERENCIA_TABLA_TURNOS = 'turnos';

export interface ResultadoRecordatorioTurnoJob {
  turnosEnVentana: number;
  notificados: number;
}

/**
 * Job de infraestructura — Historia "Recordatorios automáticos de turnos"
 * (Módulo 6, Paso 1): consulta turnos `estado='reservado'` con
 * `franja_inicio` dentro de la ventana de recordatorio (por defecto, las
 * próximas `VENTANA_RECORDATORIO_HORAS` horas desde el momento de la
 * corrida) e inserta una notificación `tipo='turno_recordatorio'` para
 * `reservado_por` de cada uno.
 *
 * A diferencia de `DetectarCoincidenciaReporteJob` (despachado
 * sincrónicamente desde un caso de uso, fire-and-forget dentro del mismo
 * request), este job es RECURRENTE: no hay ningún evento de dominio que lo
 * dispare — se ejecuta periódicamente vía un disparador externo
 * (`POST /api/webhooks/recordatorios-turnos`, ver docs/SETUP.md sección
 * 7.2). `ejecutar()` es idempotente entre corridas sucesivas: antes de
 * insertar, chequea con `INotificacionesRepositorio.existePorReferencia`
 * si ya se notificó ese turno (mismo criterio de "chequeo de aplicación
 * antes del INSERT" que `existePropuestaDe` en `IRepositorioColaboraciones`)
 * — sin eso, un turno que permanece dentro de la ventana durante varias
 * corridas (ej. el job corre cada hora, la ventana es de 24h) generaría una
 * notificación duplicada por cada corrida.
 *
 * Un fallo al notificar UN turno puntual nunca aborta la corrida completa
 * (se loguea y se sigue con el resto) — mismo criterio de resiliencia que
 * el resto de los `publicarEvento()` de este proyecto.
 */
@injectable()
export class RecordatorioTurnoJob {
  constructor(
    @inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos,
    @inject('INotificacionesRepositorio') private readonly repositorioNotificaciones: INotificacionesRepositorio,
  ) {}

  /** `ahora` es inyectable para que los tests de integración controlen determinísticamente qué turnos caen "dentro de la ventana" (Paso 4 del ticket). */
  async ejecutar(ahora: Date = new Date()): Promise<ResultadoRecordatorioTurnoJob> {
    const hasta = new Date(ahora.getTime() + VENTANA_RECORDATORIO_HORAS * 60 * 60 * 1000);
    const turnos = await this.repositorioTurnos.listarReservadosEnVentana(ahora, hasta);

    let notificados = 0;
    for (const turno of turnos) {
      try {
        const yaNotificado = await this.repositorioNotificaciones.existePorReferencia(
          turno.reservadoPor,
          TIPO_NOTIFICACION_RECORDATORIO,
          REFERENCIA_TABLA_TURNOS,
          turno.id,
        );
        if (yaNotificado) continue;

        await this.repositorioNotificaciones.crear({
          usuarioId: turno.reservadoPor,
          tipo: TIPO_NOTIFICACION_RECORDATORIO,
          referenciaTabla: REFERENCIA_TABLA_TURNOS,
          referenciaId: turno.id,
        });
        notificados += 1;
      } catch (error) {
        logger.error(
          { err: error, evento: 'RecordatorioTurno', turnoId: turno.id },
          'RecordatorioTurnoJob: no se pudo notificar el turno próximo',
        );
      }
    }

    logger.info({ turnosEnVentana: turnos.length, notificados }, 'RecordatorioTurnoJob: corrida completada');
    return { turnosEnVentana: turnos.length, notificados };
  }
}
