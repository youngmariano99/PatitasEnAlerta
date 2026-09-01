import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { ZodError } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { CrearEventoSchema, type ComandoCrearEvento, type EventoCreado } from '@aplicacion/dtos/municipio/CrearEventoDto';
import type { IRepositorioEventos } from '@dominio/puertos/IRepositorioEventos';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { FechaEventoPasadaError, SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';
import { logger } from '@infraestructura/logging/logger';

const ROLES_AUTORIZADOS = ['municipio', 'administrador'];

/** Payload crudo del panel de alta rápida + quién publica, resuelto por el route handler desde la sesión. */
export interface EntradaCrearEvento {
  datosCrudos: unknown;
  municipioId: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast — mapea la fecha
 * pasada a PEA-MUN-004, ver CrearEventoDto.ts) → autorizar (rol
 * municipio/administrador, PEA-MUN-005 en caso contrario — mismo criterio
 * que la propia RLS `eventos_crud_municipio`, docs/ROLES.md) → persistir
 * (insert en `eventos` con `municipio_id = usuario_actual()`) →
 * publicarEvento (Observer: loguea `EventoCreado`).
 *
 * "Alta rápida": no hay paso intermedio ni aprobación — el INSERT ya deja el
 * operativo visible en el calendario público de inmediato, porque la RLS
 * `eventos_select_publico` (docs/ROLES.md, `USING (deleted_at IS NULL)`) no
 * exige ningún estado adicional para mostrarlo.
 */
@injectable()
export class CrearEvento extends CasoDeUsoBase<EntradaCrearEvento, EventoCreado, ComandoCrearEvento> {
  constructor(
    @inject('IRepositorioEventos') private readonly repositorioEventos: IRepositorioEventos,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaCrearEvento): ComandoCrearEvento {
    try {
      const datos = CrearEventoSchema.parse(input.datosCrudos);
      return { ...datos, municipioId: input.municipioId };
    } catch (error) {
      throw this.aErrorDeNegocio(error);
    }
  }

  /**
   * docs/ERRORS.md marca PEA-MUN-004 explícitamente como capa "Aplicación
   * (Zod)": una fecha pasada corta acá con ese código concreto en vez de
   * caer en el PEA-SIS-005 genérico — mismo criterio que
   * ValidadorEsquemaZod.aErrorDeNegocio en ValidacionReporte.ts. Cualquier
   * otro campo inválido se relanza tal cual (el route handler lo traduce a
   * PEA-SIS-005).
   */
  private aErrorDeNegocio(error: unknown): unknown {
    if (error instanceof ZodError && error.errors[0]?.path[0] === 'fecha') {
      return new FechaEventoPasadaError();
    }
    return error;
  }

  protected async autorizar(dato: ComandoCrearEvento): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.municipioId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new SoloMunicipioAdministraEventosError();
    }
  }

  protected async persistir(dato: ComandoCrearEvento): Promise<EventoCreado> {
    const evento = await this.repositorioEventos.crear({
      municipioId: dato.municipioId,
      titulo: dato.titulo,
      tipo: dato.tipo,
      direccion: dato.direccion,
      latitud: dato.latitud,
      longitud: dato.longitud,
      fecha: dato.fecha,
      cuposTotales: dato.cuposTotales,
      requisitos: dato.requisitos ?? null,
    });

    return {
      id: evento.id,
      municipioId: evento.municipioId,
      titulo: evento.titulo,
      tipo: evento.tipo,
      direccion: evento.direccion,
      latitud: evento.latitud,
      longitud: evento.longitud,
      fecha: evento.fecha.toISOString(),
      cuposTotales: evento.cuposTotales,
      requisitos: evento.requisitos,
      createdAt: evento.createdAt.toISOString(),
    };
  }

  protected override async publicarEvento(resultado: EventoCreado): Promise<void> {
    logger.info(
      { evento: 'EventoCreado', eventoId: resultado.id, municipioId: resultado.municipioId, tipo: resultado.tipo },
      'Evento de dominio publicado',
    );
  }
}
