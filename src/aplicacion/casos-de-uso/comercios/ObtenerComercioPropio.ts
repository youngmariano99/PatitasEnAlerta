import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ComercioPropio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';

/**
 * Template Method (CasoDeUsoBase) aplicado a una consulta: el comercio
 * propio del usuario autenticado, o `null` si todavía no registró uno —
 * usado para decidir en la interfaz si mostrar el alta o el catálogo.
 */
@injectable()
export class ObtenerComercioPropio extends CasoDeUsoBase<string, ComercioPropio | null> {
  constructor(
    @inject('IRepositorioComercios') private readonly repositorioComercios: IRepositorioComercios,
  ) {
    super();
  }

  protected validar(usuarioId: string): string {
    return usuarioId;
  }

  protected async autorizar(): Promise<void> {
    // No-op: el usuario autenticado siempre puede consultar su propio comercio.
  }

  protected async persistir(usuarioId: string): Promise<ComercioPropio | null> {
    return this.repositorioComercios.obtenerPropio(usuarioId);
  }
}
