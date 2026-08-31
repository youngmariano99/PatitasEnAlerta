import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioReportes, ReporteEstadoActualizado } from '@dominio/puertos/IRepositorioReportes';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { ESTADOS_REPORTE_SOPORTADOS, type EstadoReporte } from '@dominio/entidades/Reporte';
import { ReporteEstado } from '@dominio/estados/ReporteEstado';
import {
  CambioDeEstadoInvalidoError,
  ReporteNoEncontradoError,
  SoloMunicipioActualizaEstadoError,
} from '@dominio/errores/erroresReportes';
import { logger } from '@infraestructura/logging/logger';

const ROLES_AUTORIZADOS = ['municipio', 'administrador'];

const ComandoSchema = z.object({
  reporteId: z.string().uuid('El identificador del reporte no es válido.'),
  estadoNuevo: z.enum(ESTADOS_REPORTE_SOPORTADOS, {
    required_error: 'Elegí un estado válido para el reporte.',
    invalid_type_error: 'Elegí un estado válido para el reporte.',
  }),
  solicitanteId: z.string().uuid(),
});

export interface ComandoCambiarEstadoReporte {
  reporteId: string;
  estadoNuevo: EstadoReporte;
  solicitanteId: string;
}

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — Panel municipal de
 * reportes activos (Módulo 2). `autorizar()` exige rol municipio/
 * administrador (PEA-REP-007) igual que ResolverVerificacionCommand exige
 * administrador: consulta IRepositorioPerfil, nunca confía en un campo
 * `rol` que el cliente pudiera mandar en el body.
 *
 * `persistir()` NO abre ningún switch/if sobre el estado: le pregunta a la
 * instancia de ReporteEstado (patrón State, src/dominio/estados/) si la
 * transición pedida es válida (PEA-REP-006) antes de escribir — la propia
 * RLS `reportes_update_estado` (docs/ROLES.md) es la última línea de
 * defensa si algo se saltea esta capa, pero el mensaje "cambio no válido"
 * vive acá, no en un error genérico de base de datos.
 *
 * `IRepositorioReportes.actualizarEstado` ya hace el UPDATE + el INSERT en
 * `reportes_historial_estado` dentro de una misma transacción de BD (ver
 * PrismaReporteRepositorio.ts) — `publicarEvento()` (Observer, mismo hook
 * que CrearReporte usa para 'ReporteCreado') corre después, una vez que esa
 * transacción ya confirmó, y nunca puede hacer fallar un cambio de estado
 * que en los hechos sí se aplicó.
 */
@injectable()
export class CambiarEstadoReporteCommand extends CasoDeUsoBase<ComandoCambiarEstadoReporte, ReporteEstadoActualizado> {
  constructor(
    @inject('IRepositorioReportes') private readonly repositorioReportes: IRepositorioReportes,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: ComandoCambiarEstadoReporte): ComandoCambiarEstadoReporte {
    return ComandoSchema.parse(input);
  }

  protected async autorizar(dato: ComandoCambiarEstadoReporte): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.solicitanteId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new SoloMunicipioActualizaEstadoError();
    }
  }

  protected async persistir(dato: ComandoCambiarEstadoReporte): Promise<ReporteEstadoActualizado> {
    const valorEstadoActual = await this.repositorioReportes.obtenerEstadoActual(dato.reporteId);
    if (!valorEstadoActual) {
      throw new ReporteNoEncontradoError();
    }

    const estadoActual = ReporteEstado.desde(valorEstadoActual as EstadoReporte);
    if (!estadoActual.puedeTransicionarA(dato.estadoNuevo)) {
      throw new CambioDeEstadoInvalidoError();
    }

    return this.repositorioReportes.actualizarEstado(dato.reporteId, dato.estadoNuevo, dato.solicitanteId);
  }

  protected override async publicarEvento(resultado: ReporteEstadoActualizado): Promise<void> {
    logger.info(
      { evento: 'ReporteActualizado', reporteId: resultado.id, estadoAnterior: resultado.estadoAnterior, estadoNuevo: resultado.estado },
      'Evento de dominio publicado',
    );
  }
}
