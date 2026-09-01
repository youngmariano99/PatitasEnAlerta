import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { ReprogramarTurnoSchema, type ComandoReprogramarTurno } from '@aplicacion/dtos/turnos/ReprogramarTurnoDto';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioTurnos, TurnoActual, TurnoReprogramado } from '@dominio/puertos/IRepositorioTurnos';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { EventoOTurnoNoEncontradoError, TurnoYaReservadoError } from '@dominio/errores/erroresMunicipio';

export interface EntradaReprogramarTurno {
  datosCrudos: unknown;
  usuarioId: string;
}

interface ComandoReprogramarTurnoValidado extends ComandoReprogramarTurno {
  actual: TurnoActual;
  nuevo: TurnoActual;
}

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — reprogramación de un
 * turno propio (Paso 2, "Cancelación o reprogramación de turno propio").
 * Modelada exactamente como el ticket la describe: cancelar el turno actual
 * + reservar el turno nuevo, ambos pasos ejecutados dentro de una única
 * transacción Prisma (`IRepositorioTurnos.reprogramar`) — nunca dos
 * llamadas independientes a `CancelarTurnoCommand`/`ReservarTurnoCommand`,
 * que dejarían una ventana donde el turno actual queda cancelado sin que el
 * nuevo se haya podido reservar.
 *
 * `validar()` lee AMBOS turnos (mismo criterio que `CancelarTurnoCommand`):
 * el actual tiene que existir y estar 'reservado' (si no, PEA-MUN-003); el
 * nuevo tiene que existir (aunque ya no esté 'disponible' — esa carrera la
 * resuelve la propia transacción atómica, no esta lectura previa). `.refine`
 * en el DTO ya garantiza `turnoActualId !== turnoNuevoId` antes de llegar
 * acá. `autorizar()` exige ser el reservante del turno actual — a
 * diferencia de `CancelarTurnoCommand`, el proveedor NO puede reprogramar en
 * nombre de otro (reprogramar es una acción del propio reservante).
 */
@injectable()
export class ReprogramarTurnoCommand extends CasoDeUsoBase<
  EntradaReprogramarTurno,
  TurnoReprogramado,
  ComandoReprogramarTurnoValidado
> {
  constructor(@inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos) {
    super();
  }

  protected async validar(input: EntradaReprogramarTurno): Promise<ComandoReprogramarTurnoValidado> {
    const datos = ReprogramarTurnoSchema.parse(input.datosCrudos);

    const actual = await this.repositorioTurnos.obtenerActual(datos.turnoActualId);
    if (!actual || actual.estado !== 'reservado') {
      throw new EventoOTurnoNoEncontradoError();
    }

    const nuevo = await this.repositorioTurnos.obtenerActual(datos.turnoNuevoId);
    if (!nuevo) {
      throw new EventoOTurnoNoEncontradoError();
    }

    return { ...datos, usuarioId: input.usuarioId, actual, nuevo };
  }

  protected async autorizar(dato: ComandoReprogramarTurnoValidado): Promise<void> {
    if (dato.actual.reservadoPor !== dato.usuarioId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoReprogramarTurnoValidado): Promise<TurnoReprogramado> {
    const resultado = await this.repositorioTurnos.reprogramar(
      dato.turnoActualId,
      dato.turnoNuevoId,
      dato.usuarioId,
      dato.actual.version,
      dato.nuevo.version,
    );

    if (!resultado) {
      // La transacción se revirtió por completo (todo o nada): el turno
      // nuevo ya no estaba 'disponible' con esa version es el caso
      // esperable (alguien lo reservó primero) — PEA-MUN-001. El turno
      // actual sigue 'reservado' como estaba, nunca queda cancelado sin
      // reemplazo.
      throw new TurnoYaReservadoError();
    }

    return resultado;
  }
}
