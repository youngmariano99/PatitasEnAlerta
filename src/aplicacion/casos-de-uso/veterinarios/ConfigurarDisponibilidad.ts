import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { ZodError } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ConfigurarDisponibilidadSchema,
  type ComandoConfigurarDisponibilidad,
  type DisponibilidadConfigurada,
} from '@aplicacion/dtos/veterinarios/ConfigurarDisponibilidadDto';
import { GenerarTurnosVeterinario } from '@aplicacion/casos-de-uso/veterinarios/GenerarTurnosVeterinario';
import type { IRepositorioDisponibilidad } from '@dominio/puertos/IRepositorioDisponibilidad';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { HoraFinAntesDeInicioError, CuentaVeterinariaNoVerificadaError } from '@dominio/errores/erroresVeterinarios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

/** Payload crudo del formulario de agenda + quién configura, resuelto por el route handler desde la sesión. */
export interface EntradaConfigurarDisponibilidad {
  datosCrudos: unknown;
  veterinarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Configuración de agenda del
 * veterinario" (Módulo 4). `validar()` (Zod, fail-fast — mapea el horario
 * de fin inválido a PEA-VET-001, ver ConfigurarDisponibilidadDto.ts) →
 * `autorizar()` (rol veterinario + matrícula verificada, PEA-SIS-002 /
 * PEA-VET-007 en caso contrario — mismo criterio que la RLS
 * `veterinario_verificado()`, docs/ROLES.md) → `persistir()` (upsert por
 * `diaSemana`: un veterinario tiene a lo sumo una franja configurada por día
 * de la semana, así que reconfigurar el mismo día actualiza en vez de
 * duplicar) → `publicarEvento` (Observer: loguea `DisponibilidadConfigurada`).
 *
 * Igual que `CrearEvento` dispara `GenerarTurnosEvento` tras el INSERT,
 * `persistir()` dispara `GenerarTurnosVeterinario` tras el upsert — así la
 * agenda pública del veterinario (turnos 'disponible' reservables) queda
 * sincronizada de inmediato con la nueva configuración, sin un paso manual
 * aparte. Si la franja se desactiva (`activo=false`), se omite esa
 * sincronización: no tiene sentido generar más turnos 'disponible' para un
 * bloque que el propio veterinario acaba de apagar.
 */
@injectable()
export class ConfigurarDisponibilidad extends CasoDeUsoBase<
  EntradaConfigurarDisponibilidad,
  DisponibilidadConfigurada,
  ComandoConfigurarDisponibilidad
> {
  constructor(
    @inject('IRepositorioDisponibilidad') private readonly repositorioDisponibilidad: IRepositorioDisponibilidad,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
    private readonly generarTurnosVeterinario: GenerarTurnosVeterinario,
  ) {
    super();
  }

  protected validar(input: EntradaConfigurarDisponibilidad): ComandoConfigurarDisponibilidad {
    try {
      const datos = ConfigurarDisponibilidadSchema.parse(input.datosCrudos);
      return { ...datos, veterinarioId: input.veterinarioId };
    } catch (error) {
      throw this.aErrorDeNegocio(error);
    }
  }

  /**
   * docs/ERRORS.md marca PEA-VET-001 explícitamente como capa "Aplicación
   * (Zod)": un horario de fin inválido corta acá con ese código concreto en
   * vez de caer en el PEA-SIS-005 genérico — mismo criterio que
   * `CrearEvento.aErrorDeNegocio` para PEA-MUN-004. Cualquier otro campo
   * inválido se relanza tal cual (el route handler lo traduce a PEA-SIS-005).
   */
  private aErrorDeNegocio(error: unknown): unknown {
    if (error instanceof ZodError && error.errors[0]?.path[0] === 'horaFin') {
      return new HoraFinAntesDeInicioError();
    }
    return error;
  }

  protected async autorizar(dato: ComandoConfigurarDisponibilidad): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioId);
    if (!solicitante || solicitante.rol !== 'veterinario') {
      throw new AccesoNoAutorizadoError();
    }
    if (solicitante.estadoVerificacion !== 'verificado') {
      throw new CuentaVeterinariaNoVerificadaError();
    }
  }

  protected async persistir(dato: ComandoConfigurarDisponibilidad): Promise<DisponibilidadConfigurada> {
    const existente = await this.repositorioDisponibilidad.obtenerActual(dato.veterinarioId, dato.diaSemana);

    const datosFranja = { diaSemana: dato.diaSemana, horaInicio: dato.horaInicio, horaFin: dato.horaFin, activo: dato.activo };
    const franja = existente
      ? await this.repositorioDisponibilidad.actualizar(existente.id, datosFranja)
      : await this.repositorioDisponibilidad.crear(dato.veterinarioId, datosFranja);

    const turnosGenerados = dato.activo ? await this.generarTurnosVeterinario.ejecutar(dato.veterinarioId) : [];

    return {
      id: franja.id,
      veterinarioId: franja.veterinarioId,
      diaSemana: franja.diaSemana,
      horaInicio: franja.horaInicio,
      horaFin: franja.horaFin,
      activo: franja.activo,
      createdAt: franja.createdAt.toISOString(),
      turnosGenerados: turnosGenerados.length,
    };
  }

  protected override async publicarEvento(resultado: DisponibilidadConfigurada): Promise<void> {
    logger.info(
      {
        evento: 'DisponibilidadConfigurada',
        veterinarioId: resultado.veterinarioId,
        diaSemana: resultado.diaSemana,
        turnosGenerados: resultado.turnosGenerados,
      },
      'Evento de dominio publicado',
    );
  }
}
