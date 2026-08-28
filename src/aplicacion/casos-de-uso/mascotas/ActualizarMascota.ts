import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ActualizarMascotaSchema,
  type ComandoActualizarMascota,
} from '@aplicacion/dtos/mascotas/ActualizarMascotaDto';
import type { MascotaRegistrada } from '@aplicacion/dtos/mascotas/RegistrarMascotaDto';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import { MascotaNoEncontradaError, FotoObligatoriaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';

/**
 * Template Method (CasoDeUsoBase): validar (Zod parcial, fail-fast) →
 * autorizar (la mascota existe, sigue activa, y pertenece a quien la edita)
 * → persistir (UPDATE de solo los campos provistos; `created_at` y
 * `dueñoId` nunca se tocan porque ni siquiera forman parte del comando).
 */
@injectable()
export class ActualizarMascota extends CasoDeUsoBase<ComandoActualizarMascota, MascotaRegistrada> {
  constructor(
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
    @inject('IAlmacenamientoImagenes') private readonly almacenamientoImagenes: IAlmacenamientoImagenes,
  ) {
    super();
  }

  protected validar(input: ComandoActualizarMascota): ComandoActualizarMascota {
    const cambios = ActualizarMascotaSchema.parse(input);
    if (Object.keys(cambios).length === 0) {
      throw new PayloadInvalidoError('Especificá al menos un campo para actualizar.');
    }
    return { ...cambios, id: input.id, dueñoIdSolicitante: input.dueñoIdSolicitante };
  }

  protected async autorizar(dato: ComandoActualizarMascota): Promise<void> {
    const mascota = await this.repositorioMascotas.buscarPorId(dato.id);
    if (!mascota) {
      throw new MascotaNoEncontradaError();
    }
    if (mascota.dueñoId !== dato.dueñoIdSolicitante) {
      throw new AccesoNoAutorizadoError();
    }
    if (dato.fotoUrl && !this.almacenamientoImagenes.esUrlDeImagenValida(dato.fotoUrl)) {
      throw new FotoObligatoriaError();
    }
  }

  protected async persistir(dato: ComandoActualizarMascota): Promise<MascotaRegistrada> {
    const mascota = await this.repositorioMascotas.actualizar(dato.id, {
      nombre: dato.nombre,
      especie: dato.especie,
      fotoUrl: dato.fotoUrl,
      raza: dato.raza,
      edadAproximada: dato.edadAproximada,
      identificacionChip: dato.identificacionChip,
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
