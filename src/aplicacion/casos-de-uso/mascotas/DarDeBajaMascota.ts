import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ComandoDarDeBajaMascota } from '@aplicacion/dtos/mascotas/ActualizarMascotaDto';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ComandoDarDeBajaSchema = z.object({
  id: z.string().uuid('El identificador de la mascota no es válido.'),
  dueñoIdSolicitante: z.string().uuid(),
});

export interface MascotaDadaDeBaja {
  id: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (id bien formado) → autorizar
 * (la mascota existe, sigue activa, y pertenece a quien pide la baja) →
 * persistir (UPDATE mascotas SET deleted_at = now() vía Prisma — NUNCA un
 * DELETE físico, ver PrismaMascotaRepositorio.darDeBaja).
 */
@injectable()
export class DarDeBajaMascota extends CasoDeUsoBase<ComandoDarDeBajaMascota, MascotaDadaDeBaja> {
  constructor(@inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas) {
    super();
  }

  protected validar(input: ComandoDarDeBajaMascota): ComandoDarDeBajaMascota {
    return ComandoDarDeBajaSchema.parse(input);
  }

  protected async autorizar(dato: ComandoDarDeBajaMascota): Promise<void> {
    const mascota = await this.repositorioMascotas.buscarPorId(dato.id);
    if (!mascota) {
      throw new MascotaNoEncontradaError();
    }
    if (mascota.dueñoId !== dato.dueñoIdSolicitante) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoDarDeBajaMascota): Promise<MascotaDadaDeBaja> {
    await this.repositorioMascotas.darDeBaja(dato.id);
    return { id: dato.id };
  }
}
