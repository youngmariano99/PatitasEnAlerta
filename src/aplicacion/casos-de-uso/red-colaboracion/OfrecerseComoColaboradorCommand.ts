import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  OfrecerseComoColaboradorComandoSchema,
  type ComandoOfrecerseComoColaborador,
} from '@aplicacion/dtos/red-colaboracion/OfrecerseComoColaboradorDto';
import type { ColaboracionPropuesta, IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';
import type { IRepositorioSolicitudesRecurso } from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import {
  ColaboracionYaPropuestaError,
  SolicitudNoEncontradaError,
  SolicitudYaCubiertaError,
} from '@dominio/errores/erroresRedColaboracion';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

const ESTADO_SOLICITUD_ABIERTA = 'abierta';
const ROLES_AUTORIZADOS = ['rescatista', 'veterinario'];

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — Historia "Ofrecimiento
 * como colaborador" (Módulo 5, docs/REQUISITOS.md, Post-MVP): un rescatista
 * o veterinario se propone como colaborador sobre una solicitud de recurso
 * abierta (docs/ROLES.md, matriz Módulo 5: `colaboraciones` es `CR(p)` para
 * ambos roles, ninguno con alcance total).
 *
 * `autorizar()` sigue el mismo orden deliberado que `AutorizarVeterinario`
 * (quién sos → el recurso existe → tenés permiso sobre ESE recurso, en ese
 * estado): primero el rol de quien invoca (PEA-SIS-002), después que la
 * solicitud exista (PEA-RED-003, docs/ERRORS.md — no distingue "no existe"
 * de "soft-deleted", anti-enumeración), después que siga `abierta`
 * (PEA-RED-001 — reutilizado también para `cancelada`: el catálogo no tiene
 * un código separado para ese estado, mismo criterio de reutilización que
 * PEA-RED-004 en ActualizarEstadoColaboracionCommand), y recién al final que
 * no exista ya una propuesta previa del mismo stakeholder sobre la misma
 * solicitud (PEA-RED-002) — chequeo de aplicación antes del INSERT, mismo
 * criterio que `ux_autorizacion_activa`/PEA-VET-009 en `AutorizarVeterinario`
 * (índice único documentado en docs/SCHEMA.md, no forzado hoy a nivel de
 * base de datos).
 *
 * `persistir()` vuelve a confiar únicamente en el propio INSERT (nunca en lo
 * que `autorizar()` ya leyó) — mismo criterio de "nunca confiar en una
 * lectura anterior" que `ActualizarEstadoColaboracionCommand.persistir`.
 *
 * `publicarEvento` (Observer) notifica a la organización dueña de la
 * solicitud — `tipo='colaboracion_propuesta'` (docs/SCHEMA.md,
 * `notificaciones.tipo`), desacoplado de la transacción de alta en sí, mismo
 * criterio que `ResolverVerificacionCommand`/`ReservarTurnoCommand`: un
 * fallo al notificar nunca debe hacer parecer fallido un ofrecimiento que en
 * los hechos sí se aplicó.
 */
@injectable()
export class OfrecerseComoColaboradorCommand extends CasoDeUsoBase<ComandoOfrecerseComoColaborador, ColaboracionPropuesta> {
  constructor(
    @inject('IRepositorioColaboraciones') private readonly repositorioColaboraciones: IRepositorioColaboraciones,
    @inject('IRepositorioSolicitudesRecurso') private readonly repositorioSolicitudes: IRepositorioSolicitudesRecurso,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
    @inject('INotificacionesRepositorio') private readonly repositorioNotificaciones: INotificacionesRepositorio,
  ) {
    super();
  }

  protected validar(input: ComandoOfrecerseComoColaborador): ComandoOfrecerseComoColaborador {
    return OfrecerseComoColaboradorComandoSchema.parse(input);
  }

  protected async autorizar(dato: ComandoOfrecerseComoColaborador): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.stakeholderId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new AccesoNoAutorizadoError();
    }

    const solicitud = await this.repositorioSolicitudes.obtenerActual(dato.solicitudId);
    if (!solicitud) {
      throw new SolicitudNoEncontradaError();
    }
    if (solicitud.estado !== ESTADO_SOLICITUD_ABIERTA) {
      throw new SolicitudYaCubiertaError();
    }

    const yaPropuso = await this.repositorioColaboraciones.existePropuestaDe(dato.solicitudId, dato.stakeholderId);
    if (yaPropuso) {
      throw new ColaboracionYaPropuestaError();
    }
  }

  protected async persistir(dato: ComandoOfrecerseComoColaborador): Promise<ColaboracionPropuesta> {
    return this.repositorioColaboraciones.crear({
      solicitudId: dato.solicitudId,
      stakeholderId: dato.stakeholderId,
    });
  }

  protected override async publicarEvento(resultado: ColaboracionPropuesta): Promise<void> {
    try {
      await this.repositorioNotificaciones.crear({
        usuarioId: resultado.organizacionId,
        tipo: 'colaboracion_propuesta',
        referenciaTabla: 'colaboraciones',
        referenciaId: resultado.id,
      });
    } catch (error) {
      logger.error(
        { err: error, evento: 'ColaboracionPropuesta', colaboracionId: resultado.id },
        'No se pudo publicar la notificación de ColaboracionPropuesta',
      );
    }
  }
}
