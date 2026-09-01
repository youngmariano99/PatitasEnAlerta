import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { DashboardMunicipalBuilder } from '@aplicacion/builders/DashboardMunicipalBuilder';
import type { ParametrosObtenerDashboardMunicipal, DashboardMunicipalDto } from '@aplicacion/dtos/municipio/DashboardMunicipalDto';
import type { DashboardMunicipal, IRepositorioDashboardMunicipal } from '@dominio/puertos/IRepositorioDashboardMunicipal';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';

const ROLES_AUTORIZADOS = ['municipio', 'administrador'];

/** Filtros de la query + quién consulta, resuelto por el route handler desde la sesión. */
export interface EntradaObtenerDashboardMunicipal extends ParametrosObtenerDashboardMunicipal {
  municipioId: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (los filtros ya llegan tipados
 * desde ObtenerDashboardMunicipalQuerySchema, el route handler los valida
 * antes de invocar) → autorizar (rol municipio/administrador, PEA-MUN-005 en
 * caso contrario) → persistir (delega 100% en DashboardMunicipalBuilder —
 * ver ese archivo para el Builder en sí).
 *
 * "persistir" es un nombre heredado del Template Method compartido con el
 * resto de los casos de uso de escritura (CasoDeUsoBase no distingue
 * lectura/escritura) — acá no persiste nada, solo arma y ejecuta la
 * consulta agregada de solo lectura.
 */
@injectable()
export class ObtenerDashboardMunicipal extends CasoDeUsoBase<EntradaObtenerDashboardMunicipal, DashboardMunicipalDto> {
  constructor(
    @inject('IRepositorioDashboardMunicipal') private readonly repositorioDashboard: IRepositorioDashboardMunicipal,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaObtenerDashboardMunicipal): EntradaObtenerDashboardMunicipal {
    return input;
  }

  protected async autorizar(dato: EntradaObtenerDashboardMunicipal): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.municipioId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new SoloMunicipioAdministraEventosError();
    }
  }

  protected async persistir(dato: EntradaObtenerDashboardMunicipal): Promise<DashboardMunicipalDto> {
    const zona =
      dato.latitud !== undefined && dato.longitud !== undefined && dato.radioKm !== undefined
        ? { latitud: dato.latitud, longitud: dato.longitud, radioKm: dato.radioKm }
        : undefined;

    const resultado: DashboardMunicipal = await new DashboardMunicipalBuilder()
      .conPeriodo(dato.periodoDesde, dato.periodoHasta)
      .conTipoReporte(dato.tipoReporte)
      .conZona(zona)
      .construir(this.repositorioDashboard);

    return {
      metricasReportes: resultado.metricasReportes.map((m) => ({
        periodo: m.periodo.toISOString(),
        tipo: m.tipo,
        estado: m.estado,
        zonaLat: m.zonaLat,
        zonaLng: m.zonaLng,
        total: m.total,
      })),
      metricasTurnos: resultado.metricasTurnos.map((m) => ({
        periodo: m.periodo.toISOString(),
        proveedorTipo: m.proveedorTipo,
        estado: m.estado,
        total: m.total,
      })),
    };
  }
}
