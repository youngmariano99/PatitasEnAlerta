import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ParametrosListarReportes } from '@aplicacion/dtos/reportes/ListarReportesDto';
import type { FiltrosListadoReportes, IRepositorioReportes, PaginaReportes } from '@dominio/puertos/IRepositorioReportes';

const TOPE_POR_PAGINA = 50;

/**
 * Template Method (CasoDeUsoBase) aplicado a una consulta pública de solo
 * lectura — "Listado y mapa de reportes activos" (Módulo 2). A diferencia de
 * ListarHistorialVerificaciones (exclusivo de administrador), acá
 * `autorizar()` es un no-op real: GET /reportes es explícitamente público
 * sin login (docs/ROLES.md 3.2, `reportes_select_publico` + `GRANT SELECT
 * ON reportes TO anon`), consistente con SITEMAP.md ("/reportes — consulta
 * pública sin login").
 */
@injectable()
export class ListarReportes extends CasoDeUsoBase<ParametrosListarReportes, PaginaReportes> {
  constructor(@inject('IRepositorioReportes') private readonly repositorioReportes: IRepositorioReportes) {
    super();
  }

  protected validar(input: ParametrosListarReportes): ParametrosListarReportes {
    return {
      ...input,
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      // Tope 50 impuesto acá también (no solo en el route handler): defensa
      // en profundidad ante cualquier llamador futuro del caso de uso.
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(): Promise<void> {
    // No-op deliberado: sin verificación de sesión ni de rol. Cualquier
    // visitante (autenticado o `anon`) puede listar reportes activos.
  }

  protected async persistir(dato: ParametrosListarReportes): Promise<PaginaReportes> {
    const filtros: FiltrosListadoReportes = {
      tipo: dato.tipo,
      estado: dato.estado,
      zona:
        dato.latitud !== undefined && dato.longitud !== undefined && dato.radioKm !== undefined
          ? { latitud: dato.latitud, longitud: dato.longitud, radioKm: dato.radioKm }
          : undefined,
    };

    return this.repositorioReportes.listar(filtros, dato.pagina, dato.porPagina);
  }
}
