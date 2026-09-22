import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { MascotaRegistrada } from '@aplicacion/dtos/mascotas/RegistrarMascotaDto';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

export interface ComandoObtenerMascotaPropia {
  id: string;
  dueñoIdSolicitante: string;
}

/**
 * Template Method (CasoDeUsoBase) — ficha individual de una mascota,
 * exclusiva de su dueño. Mismo chequeo de pertenencia que
 * ActualizarMascota/DarDeBajaMascota (anti-IDOR): un id ajeno cae siempre en
 * PEA-SIS-002, nunca revela si la mascota existe o no.
 */
@injectable()
export class ObtenerMascotaPropia extends CasoDeUsoBase<
  ComandoObtenerMascotaPropia,
  MascotaRegistrada
> {
  constructor(
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
  ) {
    super();
  }

  protected validar(input: ComandoObtenerMascotaPropia): ComandoObtenerMascotaPropia {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // La pertenencia se verifica en persistir(): necesitamos buscar la
    // mascota de todos modos para devolverla, así que evitamos una segunda
    // consulta redundante — mismo criterio pragmático que otros casos de
    // uso de solo lectura de este módulo.
  }

  protected async persistir(dato: ComandoObtenerMascotaPropia): Promise<MascotaRegistrada> {
    const mascota = await this.repositorioMascotas.buscarPorId(dato.id);
    if (!mascota) {
      throw new MascotaNoEncontradaError();
    }
    if (mascota.dueñoId !== dato.dueñoIdSolicitante) {
      throw new AccesoNoAutorizadoError();
    }

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
