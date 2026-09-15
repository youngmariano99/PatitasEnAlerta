import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ActualizarAsistioTurnoSchema,
  type ComandoActualizarAsistioTurno,
} from '@aplicacion/dtos/turnos/ActualizarAsistioTurnoDto';
import type { IRepositorioTurnos, TurnoActual, TurnoAsistioActualizado } from '@dominio/puertos/IRepositorioTurnos';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { EventoOTurnoNoEncontradoError } from '@dominio/errores/erroresMunicipio';
import { TurnoAunNoConcluidoError } from '@dominio/errores/erroresVeterinariosAvanzados';

/** Payload crudo del cliente + quién marca la asistencia, resuelto por el route handler desde la sesión. */
export interface EntradaActualizarAsistioTurno {
  datosCrudos: unknown;
  proveedorId: string;
}

/** El comando ya validado, con el turno actual adjunto — `autorizar()` lo necesita sin volver a consultarlo. */
interface ComandoActualizarAsistioTurnoValidado extends ComandoActualizarAsistioTurno {
  actual: TurnoActual;
}

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — Historia "Recordatorios
 * automáticos de turnos" (Módulo 6, Paso 2): "tras la franja, permitir
 * actualizar turnos.asistio desde el panel del proveedor (Municipio o
 * Veterinario)". Mismo esqueleto de tres pasos que `CancelarTurnoCommand`
 * (recurso existe → pertenece a quien invoca → el UPDATE condicionado es la
 * última palabra):
 *
 * `validar()` hace la única lectura del turno (Zod + `obtenerActual`) y
 * decide ahí mismo si es 404 (PEA-MUN-003, reutilizado — no encontrado,
 * soft-deleted, o ya no está 'reservado'). `autorizar()` reutiliza ese turno
 * ya leído para el chequeo de pertenencia: solo el PROVEEDOR del turno
 * (municipio o veterinario, el motor de turnera es agnóstico de
 * `proveedorTipo`) puede marcar asistencia — a diferencia de
 * `CancelarTurnoCommand`, acá el reservante NO tiene este permiso
 * (`docs/ROLES.md`: la asistencia la certifica quien prestó el servicio,
 * nunca quien lo recibió). `persistir()` nunca confía en la lectura de
 * `validar()`: el UPDATE condicionado de
 * `IRepositorioTurnos.actualizarAsistio` (`WHERE proveedor_id=? AND
 * estado='reservado' AND franja_fin <= now()`) es la última palabra — 0
 * filas afectadas solo puede significar que la franja todavía no concluyó
 * (existencia y pertenencia ya los garantizó `validar()`/`autorizar()`), lo
 * que se traduce en PEA-VETADV-005 (409), nunca un error de sistema.
 */
@injectable()
export class ActualizarAsistioTurnoCommand extends CasoDeUsoBase<
  EntradaActualizarAsistioTurno,
  TurnoAsistioActualizado,
  ComandoActualizarAsistioTurnoValidado
> {
  constructor(@inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos) {
    super();
  }

  protected async validar(input: EntradaActualizarAsistioTurno): Promise<ComandoActualizarAsistioTurnoValidado> {
    const datos = ActualizarAsistioTurnoSchema.parse(input.datosCrudos);

    const actual = await this.repositorioTurnos.obtenerActual(datos.turnoId);
    if (!actual || actual.estado !== 'reservado') {
      throw new EventoOTurnoNoEncontradoError();
    }

    return { ...datos, proveedorId: input.proveedorId, actual };
  }

  protected async autorizar(dato: ComandoActualizarAsistioTurnoValidado): Promise<void> {
    if (dato.actual.proveedorId !== dato.proveedorId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoActualizarAsistioTurnoValidado): Promise<TurnoAsistioActualizado> {
    const actualizado = await this.repositorioTurnos.actualizarAsistio(dato.turnoId, dato.proveedorId, dato.asistio);
    if (!actualizado) {
      throw new TurnoAunNoConcluidoError();
    }
    return actualizado;
  }
}
