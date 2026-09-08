import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  AutorizarVeterinarioSchema,
  type ComandoAutorizarVeterinario,
  type AutorizacionLibretaDto,
} from '@aplicacion/dtos/veterinarios/AutorizarVeterinarioDto';
import type { IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AutorizacionLibretaYaActivaError, VeterinarioNoEncontradoError } from '@dominio/errores/erroresVeterinarios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

/** Payload crudo del formulario (`{ veterinarioId }`) + sobre qué mascota + quién autoriza, resueltos por el route handler desde la ruta/sesión. */
export interface EntradaAutorizarVeterinario {
  datosCrudos: unknown;
  mascotaId: string;
  dueñoId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Control de accesos a la
 * libreta sanitaria" (Módulo 4, VET-05): alta de una autorización explícita
 * del dueño hacia un veterinario puntual, sobre una mascota puntual.
 *
 * `autorizar()` sigue el mismo orden deliberado que `RegistrarEntradaLibreta`
 * (quién sos → el recurso existe → tenés permiso sobre ESE recurso): primero
 * que la mascota exista y pertenezca a quien invoca (anti-IDOR, PEA-AUTH-009 /
 * PEA-SIS-002 — nunca revela si la mascota es de otro dueño o no existe),
 * después que el `veterinarioId` indicado corresponda a un usuario con rol
 * veterinario (PEA-VET-011 — mismo mensaje genérico anti-enumeración), y
 * recién al final que no exista ya una autorización activa para ese par
 * (PEA-VET-009, evita reventar la constraint `ux_autorizacion_activa` de
 * docs/SCHEMA.md contra un INSERT).
 *
 * Deliberadamente NO exige que el veterinario ya esté con matrícula
 * verificada: el dueño puede autorizar de antemano: `RegistrarEntradaLibreta`
 * ya bloquea con PEA-VET-007 cualquier escritura real hasta que la
 * verificación se resuelva.
 */
@injectable()
export class AutorizarVeterinario extends CasoDeUsoBase<
  EntradaAutorizarVeterinario,
  AutorizacionLibretaDto,
  ComandoAutorizarVeterinario
> {
  constructor(
    @inject('IRepositorioAutorizacionesLibreta')
    private readonly repositorioAutorizaciones: IRepositorioAutorizacionesLibreta,
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaAutorizarVeterinario): ComandoAutorizarVeterinario {
    const datos = AutorizarVeterinarioSchema.parse(input.datosCrudos);
    return { ...datos, mascotaId: input.mascotaId, dueñoId: input.dueñoId };
  }

  protected async autorizar(dato: ComandoAutorizarVeterinario): Promise<void> {
    const mascota = await this.repositorioMascotas.buscarPorId(dato.mascotaId);
    if (!mascota) {
      throw new MascotaNoEncontradaError();
    }
    if (mascota.dueñoId !== dato.dueñoId) {
      throw new AccesoNoAutorizadoError();
    }

    const veterinario = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioId);
    if (!veterinario || veterinario.rol !== 'veterinario') {
      throw new VeterinarioNoEncontradoError();
    }

    const autorizacionActual = await this.repositorioAutorizaciones.obtenerActual(dato.mascotaId, dato.veterinarioId);
    if (autorizacionActual && !autorizacionActual.revocadaEn) {
      throw new AutorizacionLibretaYaActivaError();
    }
  }

  protected async persistir(dato: ComandoAutorizarVeterinario): Promise<AutorizacionLibretaDto> {
    const autorizacion = await this.repositorioAutorizaciones.crear(dato.mascotaId, dato.veterinarioId);

    return {
      id: autorizacion.id,
      mascotaId: autorizacion.mascotaId,
      veterinarioId: autorizacion.veterinarioId,
      otorgadaEn: autorizacion.otorgadaEn.toISOString(),
      revocadaEn: autorizacion.revocadaEn ? autorizacion.revocadaEn.toISOString() : null,
    };
  }

  protected override async publicarEvento(resultado: AutorizacionLibretaDto): Promise<void> {
    logger.info(
      {
        evento: 'AutorizacionLibretaOtorgada',
        autorizacionId: resultado.id,
        mascotaId: resultado.mascotaId,
        veterinarioId: resultado.veterinarioId,
      },
      'Evento de dominio publicado',
    );
  }
}
