import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { ZodError } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  RegistrarEntradaLibretaSchema,
  type ComandoRegistrarEntradaLibreta,
  type EntradaLibretaRegistrada,
} from '@aplicacion/dtos/veterinarios/RegistrarEntradaLibretaDto';
import type { IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { IRepositorioEntradasLibreta } from '@dominio/puertos/IRepositorioEntradasLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import {
  CuentaVeterinariaNoVerificadaError,
  MascotaSinAccesoLibretaError,
  SinAutorizacionLibretaError,
  AutorizacionLibretaRevocadaError,
  TipoEntradaInvalidoError,
} from '@dominio/errores/erroresVeterinarios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

/** Payload crudo del formulario + quién registra, resuelto por el route handler desde la sesión. */
export interface EntradaRegistrarEntradaLibreta {
  datosCrudos: unknown;
  veterinarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Registro de entrada en la
 * libreta sanitaria" (Módulo 4, VET-03). `validar()` (Zod, fail-fast — mapea
 * un `tipo` fuera del enum soportado a PEA-VET-006, ver
 * RegistrarEntradaLibretaDto.ts) → `autorizar()` (rol veterinario + matrícula
 * verificada, luego que la mascota exista y por último que exista una
 * autorización ACTIVA del dueño para esa mascota puntual — el corazón de
 * este ticket, mismo criterio que la RLS `autorizado_sobre_mascota()`,
 * docs/ROLES.md) → `persistir()` (insert en `entradas_libreta_sanitaria`) →
 * `publicarEvento` (Observer: loguea `EntradaLibretaRegistrada`).
 *
 * Orden deliberado de `autorizar()`: primero "quién sos" (rol + verificación
 * profesional, igual que ConfigurarDisponibilidad), después "el recurso
 * existe" (mascota, PEA-VET-005 — mensaje genérico anti-IDOR, no revela si
 * el id nunca existió o está soft-deleted) y recién al final "tenés permiso
 * sobre ESE recurso puntual" (autorización activa, PEA-VET-003/004 — acá SÍ
 * se distingue "nunca autorizado" de "autorización revocada" porque
 * docs/ERRORS.md lo exige explícitamente con dos códigos distintos, a
 * diferencia del anti-enumeración de PEA-VET-005).
 */
@injectable()
export class RegistrarEntradaLibreta extends CasoDeUsoBase<
  EntradaRegistrarEntradaLibreta,
  EntradaLibretaRegistrada,
  ComandoRegistrarEntradaLibreta
> {
  constructor(
    @inject('IRepositorioAutorizacionesLibreta')
    private readonly repositorioAutorizaciones: IRepositorioAutorizacionesLibreta,
    @inject('IRepositorioEntradasLibreta') private readonly repositorioEntradas: IRepositorioEntradasLibreta,
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaRegistrarEntradaLibreta): ComandoRegistrarEntradaLibreta {
    try {
      const datos = RegistrarEntradaLibretaSchema.parse(input.datosCrudos);
      return { ...datos, veterinarioId: input.veterinarioId };
    } catch (error) {
      throw this.aErrorDeNegocio(error);
    }
  }

  /**
   * docs/ERRORS.md marca PEA-VET-006 explícitamente como capa "Aplicación
   * (Zod, CHECK tipo)": un `tipo` inválido corta acá con ese código concreto
   * en vez de caer en el PEA-SIS-005 genérico. Cualquier otro campo inválido
   * se relanza tal cual (el route handler lo traduce a PEA-SIS-005).
   */
  private aErrorDeNegocio(error: unknown): unknown {
    if (error instanceof ZodError && error.errors[0]?.path[0] === 'tipo') {
      return new TipoEntradaInvalidoError();
    }
    return error;
  }

  protected async autorizar(dato: ComandoRegistrarEntradaLibreta): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioId);
    if (!solicitante || solicitante.rol !== 'veterinario') {
      throw new AccesoNoAutorizadoError();
    }
    if (solicitante.estadoVerificacion !== 'verificado') {
      throw new CuentaVeterinariaNoVerificadaError();
    }

    const mascota = await this.repositorioMascotas.buscarPorId(dato.mascotaId);
    if (!mascota) {
      throw new MascotaSinAccesoLibretaError();
    }

    const autorizacion = await this.repositorioAutorizaciones.obtenerActual(dato.mascotaId, dato.veterinarioId);
    if (!autorizacion) {
      throw new SinAutorizacionLibretaError();
    }
    if (autorizacion.revocadaEn) {
      throw new AutorizacionLibretaRevocadaError();
    }
  }

  protected async persistir(dato: ComandoRegistrarEntradaLibreta): Promise<EntradaLibretaRegistrada> {
    const entrada = await this.repositorioEntradas.crear(dato.mascotaId, dato.veterinarioId, {
      tipo: dato.tipo,
      descripcion: dato.descripcion,
      fecha: dato.fecha,
    });

    return {
      id: entrada.id,
      mascotaId: entrada.mascotaId,
      veterinarioId: entrada.veterinarioId,
      tipo: entrada.tipo,
      descripcion: entrada.descripcion,
      fecha: entrada.fecha,
      createdAt: entrada.createdAt.toISOString(),
    };
  }

  protected override async publicarEvento(resultado: EntradaLibretaRegistrada): Promise<void> {
    logger.info(
      {
        evento: 'EntradaLibretaRegistrada',
        entradaId: resultado.id,
        mascotaId: resultado.mascotaId,
        veterinarioId: resultado.veterinarioId,
        tipo: resultado.tipo,
      },
      'Evento de dominio publicado',
    );
  }
}
