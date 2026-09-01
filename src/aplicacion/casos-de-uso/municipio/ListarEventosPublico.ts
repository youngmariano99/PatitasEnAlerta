import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ParametrosListarEventosPublico } from '@aplicacion/dtos/municipio/ListarEventosPublicoDto';
import type { FiltrosListadoEventos, IRepositorioEventos, PaginaEventos } from '@dominio/puertos/IRepositorioEventos';

const TOPE_POR_PAGINA = 50;

/**
 * Template Method (CasoDeUsoBase) aplicado a una consulta pública de solo
 * lectura — "Calendario público de operativos" (Módulo 3). Igual que
 * ListarReportes, `autorizar()` es un no-op real: GET
 * /api/municipio/eventos es explícitamente público sin login (docs/ROLES.md
 * 3.3 Patrón B, `eventos_select_publico` + `GRANT SELECT ON eventos TO
 * anon`), consistente con SITEMAP.md ("/municipio/eventos — calendario
 * público de operativos, consulta sin login").
 */
@injectable()
export class ListarEventosPublico extends CasoDeUsoBase<ParametrosListarEventosPublico, PaginaEventos> {
  constructor(@inject('IRepositorioEventos') private readonly repositorioEventos: IRepositorioEventos) {
    super();
  }

  protected validar(input: ParametrosListarEventosPublico): ParametrosListarEventosPublico {
    return {
      ...input,
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      // Tope 50 impuesto acá también (no solo en el DTO): defensa en
      // profundidad ante cualquier llamador futuro del caso de uso (Paso 3
      // del ticket).
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(): Promise<void> {
    // No-op deliberado: sin verificación de sesión ni de rol. Cualquier
    // visitante (autenticado o `anon`) puede listar operativos activos —
    // AC: "Given un usuario no autenticado... Then recibe 200... sin
    // necesidad de token."
  }

  protected async persistir(dato: ParametrosListarEventosPublico): Promise<PaginaEventos> {
    const filtros: FiltrosListadoEventos = {
      tipo: dato.tipo,
      fechaDesde: dato.fechaDesde,
      fechaHasta: dato.fechaHasta,
    };

    return this.repositorioEventos.listar(filtros, dato.pagina, dato.porPagina);
  }
}
