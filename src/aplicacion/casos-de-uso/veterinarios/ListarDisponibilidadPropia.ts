import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { FranjaDisponibilidad } from '@aplicacion/dtos/veterinarios/ConfigurarDisponibilidadDto';
import type { IRepositorioDisponibilidad } from '@dominio/puertos/IRepositorioDisponibilidad';

export interface ComandoListarDisponibilidadPropia {
  veterinarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — vista completa (activas e inactivas) de
 * "Configuración de agenda del veterinario" (Módulo 4). `autorizar()` es un
 * no-op: `IRepositorioDisponibilidad.listarPropias()` filtra siempre por
 * `veterinarioId` derivado de la sesión, mismo criterio que
 * `ListarMisTurnos.ts` — no hay forma de que este caso de uso devuelva la
 * agenda de otro veterinario.
 */
@injectable()
export class ListarDisponibilidadPropia extends CasoDeUsoBase<ComandoListarDisponibilidadPropia, FranjaDisponibilidad[]> {
  constructor(@inject('IRepositorioDisponibilidad') private readonly repositorioDisponibilidad: IRepositorioDisponibilidad) {
    super();
  }

  protected validar(input: ComandoListarDisponibilidadPropia): ComandoListarDisponibilidadPropia {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver comentario de clase.
  }

  protected async persistir(dato: ComandoListarDisponibilidadPropia): Promise<FranjaDisponibilidad[]> {
    const franjas = await this.repositorioDisponibilidad.listarPropias(dato.veterinarioId);
    return franjas.map((franja) => ({
      id: franja.id,
      veterinarioId: franja.veterinarioId,
      diaSemana: franja.diaSemana,
      horaInicio: franja.horaInicio,
      horaFin: franja.horaFin,
      activo: franja.activo,
      createdAt: franja.createdAt.toISOString(),
    }));
  }
}
