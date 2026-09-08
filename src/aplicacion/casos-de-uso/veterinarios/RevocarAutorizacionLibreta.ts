import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { AutorizacionLibretaDto } from '@aplicacion/dtos/veterinarios/AutorizarVeterinarioDto';
import type { IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AutorizacionLibretaNoEncontradaError } from '@dominio/errores/erroresVeterinarios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

export interface ComandoRevocarAutorizacionLibreta {
  mascotaId: string;
  veterinarioId: string;
  dueñoId: string;
}

/**
 * Template Method (CasoDeUsoBase) — revocación de una autorización activa
 * (Módulo 4, Historia "Control de accesos a la libreta sanitaria", VET-05).
 * Nunca es un DELETE físico: `IRepositorioAutorizacionesLibreta.revocar`
 * marca `revocada_en = now()` sobre la fila activa (docs/SCHEMA.md no tiene
 * `deleted_at` en esta tabla — la propia columna `revocada_en` cumple el rol
 * de soft delete y, a la vez, es el dato de auditoría que pide VET-05: quién
 * tuvo acceso y hasta cuándo).
 *
 * `autorizar()` verifica pertenencia de la mascota (mismo criterio anti-IDOR
 * que `AutorizarVeterinario.autorizar()`) ANTES de intentar la revocación —
 * así un intento de revocar sobre una mascota ajena corta con PEA-SIS-002 en
 * vez de con el PEA-VET-010 genérico de "no encontrada".
 */
@injectable()
export class RevocarAutorizacionLibreta extends CasoDeUsoBase<ComandoRevocarAutorizacionLibreta, AutorizacionLibretaDto> {
  constructor(
    @inject('IRepositorioAutorizacionesLibreta')
    private readonly repositorioAutorizaciones: IRepositorioAutorizacionesLibreta,
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
  ) {
    super();
  }

  protected validar(input: ComandoRevocarAutorizacionLibreta): ComandoRevocarAutorizacionLibreta {
    return input;
  }

  protected async autorizar(dato: ComandoRevocarAutorizacionLibreta): Promise<void> {
    const mascota = await this.repositorioMascotas.buscarPorId(dato.mascotaId);
    if (!mascota) {
      throw new MascotaNoEncontradaError();
    }
    if (mascota.dueñoId !== dato.dueñoId) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoRevocarAutorizacionLibreta): Promise<AutorizacionLibretaDto> {
    const revocada = await this.repositorioAutorizaciones.revocar(dato.mascotaId, dato.veterinarioId);
    if (!revocada || !revocada.revocadaEn) {
      throw new AutorizacionLibretaNoEncontradaError();
    }

    return {
      id: revocada.id,
      mascotaId: revocada.mascotaId,
      veterinarioId: revocada.veterinarioId,
      otorgadaEn: revocada.otorgadaEn.toISOString(),
      revocadaEn: revocada.revocadaEn.toISOString(),
    };
  }

  protected override async publicarEvento(resultado: AutorizacionLibretaDto): Promise<void> {
    logger.info(
      {
        evento: 'AutorizacionLibretaRevocada',
        autorizacionId: resultado.id,
        mascotaId: resultado.mascotaId,
        veterinarioId: resultado.veterinarioId,
      },
      'Evento de dominio publicado',
    );
  }
}
