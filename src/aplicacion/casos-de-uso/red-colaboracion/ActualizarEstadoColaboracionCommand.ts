import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ColaboracionEstadoActualizado, IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';
import { ESTADOS_COLABORACION_SOPORTADOS, type EstadoColaboracion } from '@dominio/entidades/Colaboracion';
import { ColaboracionEstado } from '@dominio/estados/ColaboracionEstado';
import {
  CambioDeEstadoColaboracionInvalidoError,
  ColaboracionNoEncontradaError,
  SoloOrganizacionActualizaColaboracionError,
} from '@dominio/errores/erroresRedColaboracion';
import { logger } from '@infraestructura/logging/logger';

const ComandoSchema = z.object({
  colaboracionId: z.string().uuid('El identificador de la colaboración no es válido.'),
  estadoNuevo: z.enum(ESTADOS_COLABORACION_SOPORTADOS, {
    required_error: 'Elegí un estado válido para la colaboración.',
    invalid_type_error: 'Elegí un estado válido para la colaboración.',
  }),
  solicitanteId: z.string().uuid(),
});

export interface ComandoActualizarEstadoColaboracion {
  colaboracionId: string;
  estadoNuevo: EstadoColaboracion;
  solicitanteId: string;
}

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — hilo de coordinación de
 * una colaboración (Módulo 5, docs/REQUISITOS.md: "Coordinar el seguimiento
 * de una colaboración aceptada en un hilo dedicado, con historial
 * persistente"). Mismo diseño que CambiarEstadoReporteCommand: `persistir()`
 * nunca abre un switch/if sobre el estado, le pregunta a la instancia de
 * `ColaboracionEstado` (State, src/dominio/estados/) si la transición pedida
 * es válida (PEA-RED-006) antes de escribir.
 *
 * `autorizar()` exige que quien pide el cambio sea la organización dueña de
 * la `solicitud_recurso` asociada (docs/ROLES.md, matriz Módulo 5:
 * `colaboraciones` es `U` únicamente para `organizacion`, y solo sobre sus
 * propias solicitudes — a diferencia de CambiarEstadoReporteCommand, acá no
 * hay ningún rol con acceso total/bypass, ni siquiera administrador).
 * Se reutiliza PEA-RED-004 (403) también para la transición a 'completada':
 * la matriz de permisos no distingue entre transiciones, solo entre "quién
 * tiene `U`" — ver docs/DECISIONES.md.
 *
 * `IRepositorioColaboraciones.actualizarEstado` hace el UPDATE + el INSERT
 * en `colaboraciones_historial_estado` dentro de una misma transacción de
 * BD (ver PrismaColaboracionesRepositorio.ts), igual que su equivalente de
 * reportes.
 */
@injectable()
export class ActualizarEstadoColaboracionCommand extends CasoDeUsoBase<
  ComandoActualizarEstadoColaboracion,
  ColaboracionEstadoActualizado
> {
  constructor(@inject('IRepositorioColaboraciones') private readonly repositorioColaboraciones: IRepositorioColaboraciones) {
    super();
  }

  protected validar(input: ComandoActualizarEstadoColaboracion): ComandoActualizarEstadoColaboracion {
    return ComandoSchema.parse(input);
  }

  protected async autorizar(dato: ComandoActualizarEstadoColaboracion): Promise<void> {
    const actual = await this.repositorioColaboraciones.obtenerActual(dato.colaboracionId);
    if (!actual) {
      throw new ColaboracionNoEncontradaError();
    }
    if (actual.organizacionId !== dato.solicitanteId) {
      throw new SoloOrganizacionActualizaColaboracionError();
    }
  }

  protected async persistir(dato: ComandoActualizarEstadoColaboracion): Promise<ColaboracionEstadoActualizado> {
    // Se vuelve a leer acá (autorizar() ya lo hizo) porque autorizar() y
    // persistir() son pasos separados del Template Method y ninguno de los
    // dos confía en lo que el otro ya validó — mismo criterio de
    // "nunca confiar en una lectura anterior" que ya aplica
    // PrismaReporteRepositorio.actualizarEstado dentro de su transacción.
    const actual = await this.repositorioColaboraciones.obtenerActual(dato.colaboracionId);
    if (!actual) {
      throw new ColaboracionNoEncontradaError();
    }

    const estadoActual = ColaboracionEstado.desde(actual.estado as EstadoColaboracion);
    if (!estadoActual.puedeTransicionarA(dato.estadoNuevo)) {
      throw new CambioDeEstadoColaboracionInvalidoError();
    }

    return this.repositorioColaboraciones.actualizarEstado(dato.colaboracionId, dato.estadoNuevo, dato.solicitanteId);
  }

  protected override async publicarEvento(resultado: ColaboracionEstadoActualizado): Promise<void> {
    logger.info(
      {
        evento: 'ColaboracionActualizada',
        colaboracionId: resultado.id,
        estadoAnterior: resultado.estadoAnterior,
        estadoNuevo: resultado.estado,
      },
      'Evento de dominio publicado',
    );
  }
}
