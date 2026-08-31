import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioReportes, ReporteEstadoActualizado } from '@dominio/puertos/IRepositorioReportes';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { ESTADOS_REPORTE_SOPORTADOS, TRANSICIONES_VALIDAS_REPORTE, type EstadoReporte } from '@dominio/entidades/Reporte';
import {
  CambioDeEstadoInvalidoError,
  ReporteNoEncontradoError,
  SoloMunicipioActualizaEstadoError,
} from '@dominio/errores/erroresReportes';

const ROLES_AUTORIZADOS = ['municipio', 'administrador'];

const ComandoSchema = z.object({
  reporteId: z.string().uuid('El identificador del reporte no es válido.'),
  estadoNuevo: z.enum(ESTADOS_REPORTE_SOPORTADOS, {
    required_error: 'Elegí un estado válido para el reporte.',
    invalid_type_error: 'Elegí un estado válido para el reporte.',
  }),
  solicitanteId: z.string().uuid(),
});

export interface ComandoActualizarEstadoReporte {
  reporteId: string;
  estadoNuevo: EstadoReporte;
  solicitanteId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Panel municipal de reportes activos
 * (Módulo 2). `autorizar()` exige rol municipio/administrador
 * (PEA-REP-007) igual que ResolverVerificacionCommand exige administrador:
 * consulta IRepositorioPerfil, nunca confía en un campo `rol` que el
 * cliente pudiera mandar en el body. `persistir()` valida la transición
 * contra TRANSICIONES_VALIDAS_REPORTE (PEA-REP-006) ANTES de escribir — la
 * propia RLS `reportes_update_estado` (docs/ROLES.md) es la última línea de
 * defensa si algo se saltea esta capa, pero el mensaje "cambio no válido"
 * vive acá, no en un error genérico de base de datos.
 */
@injectable()
export class ActualizarEstadoReporte extends CasoDeUsoBase<ComandoActualizarEstadoReporte, ReporteEstadoActualizado> {
  constructor(
    @inject('IRepositorioReportes') private readonly repositorioReportes: IRepositorioReportes,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: ComandoActualizarEstadoReporte): ComandoActualizarEstadoReporte {
    return ComandoSchema.parse(input);
  }

  protected async autorizar(dato: ComandoActualizarEstadoReporte): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.solicitanteId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new SoloMunicipioActualizaEstadoError();
    }
  }

  protected async persistir(dato: ComandoActualizarEstadoReporte): Promise<ReporteEstadoActualizado> {
    const estadoActual = await this.repositorioReportes.obtenerEstadoActual(dato.reporteId);
    if (!estadoActual) {
      throw new ReporteNoEncontradoError();
    }

    const transicionesPermitidas = TRANSICIONES_VALIDAS_REPORTE[estadoActual as EstadoReporte] ?? [];
    if (!transicionesPermitidas.includes(dato.estadoNuevo)) {
      throw new CambioDeEstadoInvalidoError();
    }

    return this.repositorioReportes.actualizarEstado(dato.reporteId, dato.estadoNuevo, dato.solicitanteId);
  }
}
