import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { AutorizacionLibretaDto } from '@aplicacion/dtos/veterinarios/AutorizarVeterinarioDto';
import type { IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

export interface ComandoListarAutorizacionesLibreta {
  mascotaId: string;
  dueñoId: string;
}

/**
 * Template Method (CasoDeUsoBase) — historial completo (vigentes y
 * revocadas) de autorizaciones de una mascota (Módulo 4, VET-05), exclusivo
 * del dueño de esa mascota puntual. `autorizar()` repite el mismo chequeo de
 * pertenencia que `AutorizarVeterinario`/`RevocarAutorizacionLibreta` — sin
 * él, cualquier usuario autenticado podría enumerar qué veterinarios
 * atendieron la mascota de otro dueño con solo adivinar su id (anti-IDOR).
 */
@injectable()
export class ListarAutorizacionesLibreta extends CasoDeUsoBase<ComandoListarAutorizacionesLibreta, AutorizacionLibretaDto[]> {
  constructor(
    @inject('IRepositorioAutorizacionesLibreta')
    private readonly repositorioAutorizaciones: IRepositorioAutorizacionesLibreta,
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
  ) {
    super();
  }

  protected validar(input: ComandoListarAutorizacionesLibreta): ComandoListarAutorizacionesLibreta {
    return input;
  }

  protected async autorizar(dato: ComandoListarAutorizacionesLibreta): Promise<void> {
    const mascota = await this.repositorioMascotas.buscarPorId(dato.mascotaId);
    if (!mascota) {
      throw new MascotaNoEncontradaError();
    }
    if (mascota.dueñoId !== dato.dueñoId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarAutorizacionesLibreta): Promise<AutorizacionLibretaDto[]> {
    const autorizaciones = await this.repositorioAutorizaciones.listarPorMascota(dato.mascotaId);
    return autorizaciones.map((autorizacion) => ({
      id: autorizacion.id,
      mascotaId: autorizacion.mascotaId,
      veterinarioId: autorizacion.veterinarioId,
      otorgadaEn: autorizacion.otorgadaEn.toISOString(),
      revocadaEn: autorizacion.revocadaEn ? autorizacion.revocadaEn.toISOString() : null,
    }));
  }
}
