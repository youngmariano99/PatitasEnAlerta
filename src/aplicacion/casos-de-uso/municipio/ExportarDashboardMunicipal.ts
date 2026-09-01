import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { ZodError } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { DashboardMunicipalBuilder } from '@aplicacion/builders/DashboardMunicipalBuilder';
import {
  ExportarDashboardMunicipalQuerySchema,
  type ParametrosExportarDashboardMunicipal,
} from '@aplicacion/dtos/municipio/ExportarDashboardMunicipalDto';
import { AgregadoDashboardMunicipal, ExportadorReporteVisitor } from '@aplicacion/visitors/ExportadorReporteVisitor';
import type { IRepositorioDashboardMunicipal } from '@dominio/puertos/IRepositorioDashboardMunicipal';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { RangoFechasInvalidoExportacionError, SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';

const ROLES_AUTORIZADOS = ['municipio', 'administrador'];

/** Payload crudo de la query + quién exporta, resuelto por el route handler desde la sesión. */
export interface EntradaExportarDashboardMunicipal {
  datosCrudos: unknown;
  municipioId: string;
}

export interface DashboardMunicipalExportado {
  csv: string;
  nombreArchivo: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (Zod — periodoDesde/periodoHasta
 * obligatorios, `periodoHasta > periodoDesde` mapeado a PEA-MUN-007, Paso 2)
 * → autorizar (rol municipio/administrador, PEA-MUN-005 en caso contrario)
 * → persistir (arma la MISMA consulta que ObtenerDashboardMunicipal.ts vía
 * DashboardMunicipalBuilder — nunca sobre `reportes`/`turnos` en vivo — y
 * delega en ExportadorReporteVisitor, patrón Visitor, Paso 1, la generación
 * del CSV).
 *
 * Reutilizar el Builder es lo que garantiza el AC "el CSV descargado
 * contiene exactamente los mismos datos que se muestran en pantalla": ambos
 * casos de uso arman la consulta de la misma forma, para el mismo rango.
 */
@injectable()
export class ExportarDashboardMunicipal extends CasoDeUsoBase<
  EntradaExportarDashboardMunicipal,
  DashboardMunicipalExportado,
  ParametrosExportarDashboardMunicipal & { municipioId: string }
> {
  constructor(
    @inject('IRepositorioDashboardMunicipal') private readonly repositorioDashboard: IRepositorioDashboardMunicipal,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(
    input: EntradaExportarDashboardMunicipal,
  ): ParametrosExportarDashboardMunicipal & { municipioId: string } {
    try {
      const datos = ExportarDashboardMunicipalQuerySchema.parse(input.datosCrudos);
      return { ...datos, municipioId: input.municipioId };
    } catch (error) {
      throw this.aErrorDeNegocio(error);
    }
  }

  /**
   * docs/ERRORS.md marca PEA-MUN-007 explícitamente como capa "Aplicación
   * (Zod)": un rango de fechas ausente o inválido corta acá con ese código
   * concreto — mismo criterio que CrearEventoDto/PEA-MUN-004
   * (ValidadorEsquemaZod.aErrorDeNegocio en ValidacionReporte.ts). Este
   * endpoint no tiene ningún otro campo además del rango, así que cualquier
   * `ZodError` que llegue es, por descarte, sobre `periodoDesde`/`periodoHasta`.
   */
  private aErrorDeNegocio(error: unknown): unknown {
    if (error instanceof ZodError) {
      return new RangoFechasInvalidoExportacionError();
    }
    return error;
  }

  protected async autorizar(dato: { municipioId: string }): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.municipioId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new SoloMunicipioAdministraEventosError();
    }
  }

  protected async persistir(
    dato: ParametrosExportarDashboardMunicipal & { municipioId: string },
  ): Promise<DashboardMunicipalExportado> {
    const resultado = await new DashboardMunicipalBuilder()
      .conPeriodo(dato.periodoDesde, dato.periodoHasta)
      .construir(this.repositorioDashboard);

    const agregado = new AgregadoDashboardMunicipal(resultado.metricasReportes, resultado.metricasTurnos);
    const csv = new ExportadorReporteVisitor().generarCsv(agregado);

    // Paso 3 / verificación técnica: la fecha en el nombre de archivo es la
    // de GENERACIÓN (hoy), no el rango exportado — dos descargas del mismo
    // rango en días distintos nunca deberían pisarse el nombre.
    const fechaDeGeneracion = new Date().toISOString().slice(0, 10);

    return { csv, nombreArchivo: `resumen-actividad-municipal-${fechaDeGeneracion}.csv` };
  }
}
