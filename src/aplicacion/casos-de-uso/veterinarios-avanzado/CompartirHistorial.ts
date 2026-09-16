import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  CompartirHistorialSchema,
  type ComandoCompartirHistorial,
  type HistorialCompartidoDto,
} from '@aplicacion/dtos/veterinarios-avanzado/HistorialCompartidoDto';
import type { IRepositorioHistorialesCompartidos } from '@dominio/puertos/IRepositorioHistorialesCompartidos';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { VeterinarioNoEncontradoError } from '@dominio/errores/erroresVeterinarios';
import { HistorialCompartidoConUnoMismoError } from '@dominio/errores/erroresVeterinariosAvanzados';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

const ROL_AUTORIZADO = 'veterinario';

/** Payload crudo del formulario + quién comparte (siempre la sesión, nunca el body). */
export interface EntradaCompartirHistorial {
  datosCrudos: unknown;
  veterinarioOrigenId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Paso 1 de "CRUD de historiales_compartidos
 * con autorización explícita y revocable" (Módulo 6). `autorizar()` valida
 * `veterinario_origen_id <> veterinario_destino_id` (AC explícito del
 * ticket, PEA-VETADV-003) ANTES de tocar la base — el `CHECK
 * ck_historial_veterinarios_distintos` de docs/SCHEMA.md queda como defensa
 * en profundidad, nunca como el único punto de validación (mismo criterio
 * que cualquier `CHECK` de base en este proyecto: la aplicación no debe
 * depender de que la constraint reviente para dar un error de negocio legible).
 *
 * Orden de validación: rol de quien invoca → distinción origen/destino
 * (falla más barata, sin I/O) → existencia de la mascota (PEA-AUTH-009) →
 * que el destino sea un veterinario real (PEA-VET-011, mismo mensaje
 * anti-enumeración que `AutorizarVeterinario.autorizar()`).
 */
@injectable()
export class CompartirHistorial extends CasoDeUsoBase<
  EntradaCompartirHistorial,
  HistorialCompartidoDto,
  ComandoCompartirHistorial
> {
  constructor(
    @inject('IRepositorioHistorialesCompartidos')
    private readonly repositorioHistoriales: IRepositorioHistorialesCompartidos,
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaCompartirHistorial): ComandoCompartirHistorial {
    const datos = CompartirHistorialSchema.parse(input.datosCrudos);
    return { ...datos, veterinarioOrigenId: input.veterinarioOrigenId };
  }

  protected async autorizar(dato: ComandoCompartirHistorial): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioOrigenId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }

    if (dato.veterinarioOrigenId === dato.veterinarioDestinoId) {
      throw new HistorialCompartidoConUnoMismoError();
    }

    const mascota = await this.repositorioMascotas.buscarPorId(dato.mascotaId);
    if (!mascota) {
      throw new MascotaNoEncontradaError();
    }

    const destino = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioDestinoId);
    if (!destino || destino.rol !== ROL_AUTORIZADO) {
      throw new VeterinarioNoEncontradoError();
    }
  }

  protected async persistir(dato: ComandoCompartirHistorial): Promise<HistorialCompartidoDto> {
    const historial = await this.repositorioHistoriales.crear({
      mascotaId: dato.mascotaId,
      veterinarioOrigenId: dato.veterinarioOrigenId,
      veterinarioDestinoId: dato.veterinarioDestinoId,
    });

    return {
      id: historial.id,
      mascotaId: historial.mascotaId,
      veterinarioOrigenId: historial.veterinarioOrigenId,
      veterinarioDestinoId: historial.veterinarioDestinoId,
      autorizadoEn: historial.autorizadoEn.toISOString(),
      revocadoEn: historial.revocadoEn ? historial.revocadoEn.toISOString() : null,
    };
  }

  protected override async publicarEvento(resultado: HistorialCompartidoDto): Promise<void> {
    logger.info(
      {
        evento: 'HistorialCompartido',
        historialId: resultado.id,
        mascotaId: resultado.mascotaId,
        veterinarioOrigenId: resultado.veterinarioOrigenId,
        veterinarioDestinoId: resultado.veterinarioDestinoId,
      },
      'Evento de dominio publicado',
    );
  }
}
