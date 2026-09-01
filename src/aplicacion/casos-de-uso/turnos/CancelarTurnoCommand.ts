import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CancelarTurnoSchema, type ComandoCancelarTurno } from '@aplicacion/dtos/turnos/CancelarTurnoDto';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioTurnos, TurnoActual, TurnoCancelado } from '@dominio/puertos/IRepositorioTurnos';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { EventoOTurnoNoEncontradoError } from '@dominio/errores/erroresMunicipio';
import { logger } from '@infraestructura/logging/logger';

/** Payload crudo del cliente + quién cancela, resuelto por el route handler desde la sesión. */
export interface EntradaCancelarTurno {
  datosCrudos: unknown;
  usuarioId: string;
}

/** El comando ya validado, con el turno actual adjunto — `autorizar()` lo necesita sin volver a consultarlo. */
interface ComandoCancelarTurnoValidado extends ComandoCancelarTurno {
  actual: TurnoActual;
}

/** Resultado expuesto al cliente + quién canceló, para que `publicarEvento` decida a quién notificar sin volver a consultar nada. */
export interface ResultadoCancelarTurno extends TurnoCancelado {
  canceladoPor: string;
}

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — "Cancelación o
 * reprogramación de turno propio" (Módulo 3). A diferencia de
 * ReservarTurnoCommand (donde `autorizar()` es un no-op porque cualquier
 * autenticado puede reservar para sí mismo), acá SÍ hay una verificación de
 * pertenencia real: solo el reservante o el proveedor del turno pueden
 * cancelarlo (Paso 1, AC #2 — PEA-SIS-002/403 para cualquier otro).
 *
 * `validar()` hace la única lectura del turno (Zod + `obtenerActual`) y
 * decide ahí mismo si es 404: no encontrado, soft-deleted, o ya no está
 * 'reservado' (incluye "ya cancelado", AC #3/Paso 4) — el mismo código
 * PEA-MUN-003 cubre los tres casos, indistinguibles para quien cancela.
 * `autorizar()` reutiliza ese turno ya leído (sin una segunda consulta)
 * para el chequeo de pertenencia. `persistir()` ejecuta el UPDATE
 * condicionado por control optimista (`IRepositorioTurnos.cancelar`,
 * mismo criterio que `reservar`): 0 filas afectadas — alguien más ganó la
 * carrera entre la lectura y esta escritura — también cae en PEA-MUN-003,
 * nunca un error de sistema.
 *
 * `publicarEvento` (Observer, evento de dominio "TurnoCancelado") inserta
 * la notificación `tipo='turno_cancelado'` al PROVEEDOR únicamente cuando
 * quien cancela es el reservante (Paso 3) — si el proveedor cancela su
 * propio turno, no tiene sentido notificarse a sí mismo.
 */
@injectable()
export class CancelarTurnoCommand extends CasoDeUsoBase<EntradaCancelarTurno, ResultadoCancelarTurno, ComandoCancelarTurnoValidado> {
  constructor(
    @inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos,
    @inject('INotificacionesRepositorio') private readonly repositorioNotificaciones: INotificacionesRepositorio,
  ) {
    super();
  }

  protected async validar(input: EntradaCancelarTurno): Promise<ComandoCancelarTurnoValidado> {
    const datos = CancelarTurnoSchema.parse(input.datosCrudos);

    const actual = await this.repositorioTurnos.obtenerActual(datos.turnoId);
    if (!actual || actual.estado !== 'reservado') {
      throw new EventoOTurnoNoEncontradoError();
    }

    return { turnoId: datos.turnoId, usuarioId: input.usuarioId, actual };
  }

  protected async autorizar(dato: ComandoCancelarTurnoValidado): Promise<void> {
    const { actual, usuarioId } = dato;
    if (actual.reservadoPor !== usuarioId && actual.proveedorId !== usuarioId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoCancelarTurnoValidado): Promise<ResultadoCancelarTurno> {
    const cancelado = await this.repositorioTurnos.cancelar(dato.turnoId, dato.actual.version);
    if (!cancelado) {
      // 0 filas afectadas: alguien ganó la carrera entre validar() y este
      // UPDATE (ej. otra request lo canceló primero) — mismo código que
      // "ya cancelado" arriba, indistinguible para el cliente.
      throw new EventoOTurnoNoEncontradoError();
    }

    return { ...cancelado, canceladoPor: dato.usuarioId };
  }

  protected override async publicarEvento(resultado: ResultadoCancelarTurno): Promise<void> {
    const canceloElReservante = resultado.canceladoPor === resultado.reservadoPor;
    if (!canceloElReservante) return;

    try {
      await this.repositorioNotificaciones.crear({
        usuarioId: resultado.proveedorId,
        tipo: 'turno_cancelado',
        referenciaTabla: 'turnos',
        referenciaId: resultado.id,
      });
    } catch (error) {
      logger.error(
        { err: error, evento: 'TurnoCancelado', turnoId: resultado.id },
        'No se pudo publicar la notificación de TurnoCancelado',
      );
    }
  }
}
