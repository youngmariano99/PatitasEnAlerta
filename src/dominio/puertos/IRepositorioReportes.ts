import type { Reporte } from '@dominio/entidades/Reporte';

/**
 * Datos necesarios para dar de alta un reporte. `estado` no forma parte de
 * este tipo a propósito: todo alta nace en `estado='reportado'` (docs/SCHEMA.md
 * — DEFAULT 'reportado'), nunca lo decide el llamador.
 */
export interface DatosNuevoReporte {
  tipo: string;
  subtipo: string | null;
  reportadoPor: string;
  mascotaId: string | null;
  descripcion: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  especie: string | null;
}

/** Filtro geográfico compartido por EvaluarCoincidenciaReporte y ListarReportes. */
export interface FiltroZona {
  latitud: number;
  longitud: number;
  /** Radio de búsqueda alrededor de (latitud, longitud), en kilómetros. */
  radioKm: number;
}

/** Criterios de búsqueda de EvaluarCoincidenciaReporte (REP-U-06). */
export interface CriteriosCoincidenciaReporte extends FiltroZona {
  especie: string;
  /** El propio reporte 'encontrado' recién creado nunca es candidato de sí mismo. */
  excluirReporteId: string;
}

/** Proyección mínima de un reporte 'perdido' activo, suficiente para notificar a quien lo publicó. */
export interface ReporteActivoResumen {
  id: string;
  reportadoPor: string;
}

/**
 * Filtros del listado público (ListarReportes). `estado` ausente = solo
 * activos (ESTADOS_REPORTE_ACTIVOS) — mismo criterio que "Listado y mapa de
 * reportes activos" (historia de este ticket); un `estado` explícito
 * (incluido 'resuelto'/'cerrado') lo reemplaza por completo, nunca se
 * combinan ambos.
 */
export interface FiltrosListadoReportes {
  tipo?: string;
  estado?: string;
  zona?: FiltroZona;
}

/** Proyección pública de un reporte — sin `reportadoPor` (no es necesario para la tabla/mapa público). */
export interface ReporteListado {
  id: string;
  tipo: string;
  subtipo: string | null;
  descripcion: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  especie: string | null;
  estado: string;
  createdAt: Date;
}

export interface PaginaReportes {
  items: ReporteListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Puerto hacia la persistencia de reportes. CrearReporte,
 * EvaluarCoincidenciaReporte y ListarReportes dependen únicamente de esta
 * abstracción — nunca de Prisma directamente.
 */
export interface IRepositorioReportes {
  crear(datos: DatosNuevoReporte): Promise<Reporte>;
  /** Reportes 'perdido' activos (docs/entidades/Reporte.ts, ESTADOS_REPORTE_ACTIVOS) dentro del radio y de la misma especie. */
  buscarPerdidosActivosPorZonaYEspecie(criterios: CriteriosCoincidenciaReporte): Promise<ReporteActivoResumen[]>;
  /** Listado público paginado (tope 50) — reportes 'reportado'/'en_revision'/'en_atencion' vinculados por soft delete. */
  listar(filtros: FiltrosListadoReportes, pagina: number, porPagina: number): Promise<PaginaReportes>;
}
