import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioDisponibilidad } from '@dominio/puertos/IRepositorioDisponibilidad';
import { DisponibilidadNoEncontradaError } from '@dominio/errores/erroresVeterinarios';

export interface ComandoDarDeBajaDisponibilidad {
  disponibilidadId: string;
  veterinarioId: string;
}

export interface DisponibilidadDadaDeBaja {
  id: string;
  veterinarioId: string;
  diaSemana: number;
}

/**
 * Template Method (CasoDeUsoBase) — baja de una franja de agenda propia
 * (Módulo 4). `autorizar()` es un no-op deliberado: la pertenencia no se
 * verifica con una consulta aparte, la impone
 * `IRepositorioDisponibilidad.eliminar()` mismo (siempre filtra por
 * `veterinarioId`, anti-IDOR) — mismo criterio que `ListarMisTurnos.ts`.
 * Los turnos 'disponible' ya generados para esa franja NO se cancelan acá:
 * quedan intactos hasta su `franja_inicio` (alcance de esta actividad es
 * dejar de generar turnos nuevos, no revocar los ya ofrecidos).
 */
@injectable()
export class DarDeBajaDisponibilidad extends CasoDeUsoBase<ComandoDarDeBajaDisponibilidad, DisponibilidadDadaDeBaja> {
  constructor(@inject('IRepositorioDisponibilidad') private readonly repositorioDisponibilidad: IRepositorioDisponibilidad) {
    super();
  }

  protected validar(input: ComandoDarDeBajaDisponibilidad): ComandoDarDeBajaDisponibilidad {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver comentario de clase.
  }

  protected async persistir(dato: ComandoDarDeBajaDisponibilidad): Promise<DisponibilidadDadaDeBaja> {
    const eliminada = await this.repositorioDisponibilidad.eliminar(dato.disponibilidadId, dato.veterinarioId);
    if (!eliminada) {
      throw new DisponibilidadNoEncontradaError();
    }

    return { id: eliminada.id, veterinarioId: eliminada.veterinarioId, diaSemana: eliminada.diaSemana };
  }
}
