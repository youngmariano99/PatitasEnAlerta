import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  RegistrarMascotaSchema,
  type ComandoRegistrarMascota,
  type MascotaRegistrada,
} from '@aplicacion/dtos/mascotas/RegistrarMascotaDto';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import { FotoObligatoriaError } from '@dominio/errores/erroresMascotas';

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast) → autorizar
 * (la fotoUrl recibida tiene que pertenecer a nuestra cuenta de Cloudinary,
 * nunca una URL arbitraria) → persistir (insert en `mascotas` con el
 * `dueñoId` ya resuelto por el route handler a partir de la sesión).
 */
@injectable()
export class RegistrarMascota extends CasoDeUsoBase<ComandoRegistrarMascota, MascotaRegistrada> {
  constructor(
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
    @inject('IAlmacenamientoImagenes') private readonly almacenamientoImagenes: IAlmacenamientoImagenes,
  ) {
    super();
  }

  protected validar(input: ComandoRegistrarMascota): ComandoRegistrarMascota {
    // `dueñoId` no forma parte de RegistrarMascotaSchema (ver DTO): lo
    // valida el route handler antes de llamar acá, nunca viaja sin validar.
    const datos = RegistrarMascotaSchema.parse(input);
    return { ...datos, dueñoId: input.dueñoId };
  }

  protected async autorizar(dato: ComandoRegistrarMascota): Promise<void> {
    if (!this.almacenamientoImagenes.esUrlDeImagenValida(dato.fotoUrl)) {
      throw new FotoObligatoriaError();
    }
  }

  protected async persistir(dato: ComandoRegistrarMascota): Promise<MascotaRegistrada> {
    const mascota = await this.repositorioMascotas.crear({
      dueñoId: dato.dueñoId,
      nombre: dato.nombre,
      especie: dato.especie,
      fotoUrl: dato.fotoUrl,
      raza: dato.raza ?? null,
      edadAproximada: dato.edadAproximada ?? null,
      identificacionChip: dato.identificacionChip ?? null,
    });

    return {
      id: mascota.id,
      dueñoId: mascota.dueñoId,
      nombre: mascota.nombre,
      especie: mascota.especie,
      fotoUrl: mascota.fotoUrl,
      raza: mascota.raza,
      edadAproximada: mascota.edadAproximada,
      identificacionChip: mascota.identificacionChip,
    };
  }
}
