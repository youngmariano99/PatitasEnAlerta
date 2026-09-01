import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { ReservarTurnoSchema, type ComandoReservarTurno, type TurnoReservadoDto } from '@aplicacion/dtos/turnos/ReservarTurnoDto';
import type { IRepositorioTurnos } from '@dominio/puertos/IRepositorioTurnos';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { EventoOTurnoNoEncontradoError, TurnoYaReservadoError } from '@dominio/errores/erroresMunicipio';
import { logger } from '@infraestructura/logging/logger';

/** Payload crudo del cliente + quién reserva, resuelto por el route handler desde la sesión. */
export interface EntradaReservarTurno {
  datosCrudos: unknown;
  reservadoPor: string;
}

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — "Reserva de turno en un
 * operativo municipal" (Módulo 3). `autorizar()` es un no-op deliberado:
 * cualquier usuario autenticado puede reservar un turno 'disponible' para sí
 * mismo (docs/ROLES.md 3.5, `turnos_update` — sin restricción de rol), la
 * RLS es la última línea de defensa si algo se saltea esta capa.
 *
 * `persistir()` implementa el control optimista de concurrencia exigido por
 * docs/SCHEMA.md: lee `version`/`estado` actuales y después ejecuta el
 * UPDATE condicionado (`WHERE id=? AND estado='disponible' AND version=?`,
 * `SET estado='reservado', version=version+1, reservado_por=?`) a través de
 * `IRepositorioTurnos.reservar`. Si el UPDATE afecta 0 filas — porque otra
 * request ganó la carrera entre esa lectura y esta escritura, o el turno ya
 * no está 'disponible' — la respuesta es PEA-MUN-001 (409), nunca un error
 * de sistema: el propio catálogo (docs/ERRORS.md) indica refrescar
 * automáticamente la lista de turnos disponibles en el cliente.
 *
 * `publicarEvento` (Observer, evento de dominio "TurnoReservado") inserta la
 * notificación `tipo='turno_confirmado'` para quien reservó — desacoplada
 * de la transacción de reserva en sí (mismo criterio que
 * ResolverVerificacionCommand.publicarEvento): un fallo al notificar nunca
 * debe hacer parecer fallida una reserva que en los hechos sí se aplicó.
 */
@injectable()
export class ReservarTurnoCommand extends CasoDeUsoBase<EntradaReservarTurno, TurnoReservadoDto, ComandoReservarTurno> {
  constructor(
    @inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos,
    @inject('INotificacionesRepositorio') private readonly repositorioNotificaciones: INotificacionesRepositorio,
  ) {
    super();
  }

  protected validar(input: EntradaReservarTurno): ComandoReservarTurno {
    const datos = ReservarTurnoSchema.parse(input.datosCrudos);
    return { ...datos, reservadoPor: input.reservadoPor };
  }

  protected async autorizar(): Promise<void> {
    // No-op deliberado — ver docstring de la clase.
  }

  protected async persistir(dato: ComandoReservarTurno): Promise<TurnoReservadoDto> {
    const actual = await this.repositorioTurnos.obtenerActual(dato.turnoId);
    if (!actual) {
      throw new EventoOTurnoNoEncontradoError();
    }

    const reservado = await this.repositorioTurnos.reservar(dato.turnoId, dato.reservadoPor, actual.version);
    if (!reservado) {
      throw new TurnoYaReservadoError();
    }

    return reservado;
  }

  protected override async publicarEvento(resultado: TurnoReservadoDto): Promise<void> {
    try {
      await this.repositorioNotificaciones.crear({
        usuarioId: resultado.reservadoPor,
        tipo: 'turno_confirmado',
        referenciaTabla: 'turnos',
        referenciaId: resultado.id,
      });
    } catch (error) {
      logger.error(
        { err: error, evento: 'TurnoReservado', turnoId: resultado.id },
        'No se pudo publicar la notificación de TurnoReservado',
      );
    }
  }
}
