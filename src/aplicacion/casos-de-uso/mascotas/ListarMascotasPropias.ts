import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { MascotaRegistrada } from '@aplicacion/dtos/mascotas/RegistrarMascotaDto';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';

/**
 * Template Method (CasoDeUsoBase) aplicado a una consulta: `dueñoId` ya
 * llega resuelto por el route handler a partir de la sesión verificada —
 * cada usuario solo puede listar sus propias mascotas, nunca las de otro
 * (anti-IDOR: no hay ningún id ajeno que aceptar acá).
 */
@injectable()
export class ListarMascotasPropias extends CasoDeUsoBase<string, MascotaRegistrada[]> {
  constructor(
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
  ) {
    super();
  }

  protected validar(dueñoId: string): string {
    return dueñoId;
  }

  protected async autorizar(): Promise<void> {
    // No-op: el usuario autenticado siempre puede listar sus propias mascotas.
  }

  protected async persistir(dueñoId: string): Promise<MascotaRegistrada[]> {
    const mascotas = await this.repositorioMascotas.listarPorDueño(dueñoId);
    return mascotas.map((mascota) => ({
      id: mascota.id,
      dueñoId: mascota.dueñoId,
      nombre: mascota.nombre,
      especie: mascota.especie,
      fotoUrl: mascota.fotoUrl,
      raza: mascota.raza,
      edadAproximada: mascota.edadAproximada,
      identificacionChip: mascota.identificacionChip,
    }));
  }
}
