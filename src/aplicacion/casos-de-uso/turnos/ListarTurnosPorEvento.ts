import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { TurnoDisponibleDto } from '@aplicacion/dtos/turnos/ListarTurnosPorEventoDto';
import type { IRepositorioTurnos } from '@dominio/puertos/IRepositorioTurnos';

/**
 * Template Method (CasoDeUsoBase) aplicado a una consulta: todos los turnos
 * de un evento (cualquier estado), para que la turnera municipal vea el
 * cupo completo y el vecino que reserva filtre del lado del cliente a
 * `estado='disponible'`. Sin restricción de autoría — el calendario de
 * operativos ya es público (`ListarEventosPublico`), así que sus turnos
 * también lo son para cualquier usuario autenticado.
 */
@injectable()
export class ListarTurnosPorEvento extends CasoDeUsoBase<string, TurnoDisponibleDto[]> {
  constructor(
    @inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos,
  ) {
    super();
  }

  protected validar(eventoId: string): string {
    return eventoId;
  }

  protected async autorizar(): Promise<void> {
    // No-op: el calendario de operativos es público, listar sus turnos también lo es.
  }

  protected async persistir(eventoId: string): Promise<TurnoDisponibleDto[]> {
    const turnos = await this.repositorioTurnos.listarPorEvento(eventoId);
    return turnos.map((turno) => ({
      id: turno.id,
      franjaInicio: turno.franjaInicio.toISOString(),
      franjaFin: turno.franjaFin.toISOString(),
      estado: turno.estado,
    }));
  }
}
