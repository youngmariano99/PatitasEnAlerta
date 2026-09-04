import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioTurnos, PaginaTurnosReservadosVeterinario } from '@dominio/puertos/IRepositorioTurnos';

const TOPE_POR_PAGINA = 50;

export interface ComandoListarTurnosVeterinario {
  veterinarioId: string;
  pagina: number;
  porPagina: number;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Listado de turnos reservados
 * del veterinario" (Módulo 4). `autorizar()` es un no-op deliberado, mismo
 * criterio que `ListarMisTurnos.ts`/`ListarDisponibilidadPropia.ts`: la
 * pertenencia no se verifica con una consulta aparte, la impone
 * `IRepositorioTurnos.listarReservadosPorProveedor()` mismo (siempre
 * filtra por `proveedorId=veterinarioId` derivado de la sesión), así que
 * no hay forma de que este caso de uso devuelva la agenda de otro
 * veterinario ni turnos de otro proveedor.
 */
@injectable()
export class ListarTurnosVeterinario extends CasoDeUsoBase<ComandoListarTurnosVeterinario, PaginaTurnosReservadosVeterinario> {
  constructor(@inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos) {
    super();
  }

  protected validar(input: ComandoListarTurnosVeterinario): ComandoListarTurnosVeterinario {
    return {
      ...input,
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver comentario de clase.
  }

  protected async persistir(dato: ComandoListarTurnosVeterinario): Promise<PaginaTurnosReservadosVeterinario> {
    return this.repositorioTurnos.listarReservadosPorProveedor(dato.veterinarioId, dato.pagina, dato.porPagina);
  }
}
