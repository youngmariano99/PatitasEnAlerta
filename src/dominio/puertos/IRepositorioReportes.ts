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
 * combinan ambos. `fechaDesde`/`fechaHasta` filtran por `created_at`
 * (Panel municipal, Módulo 2) y se combinan simultáneamente con
 * `tipo`/`estado`/`zona`, no en lugar de ellos.
 */
export interface FiltrosListadoReportes {
  tipo?: string;
  estado?: string;
  zona?: FiltroZona;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

/** Resultado de un cambio de estado exitoso — ver CambiarEstadoReporteCommand.ts. */
export interface ReporteEstadoActualizado {
  id: string;
  estado: string;
  estadoAnterior: string;
}

/** Una fila de `reportes_historial_estado` — ver ListarHistorialReporte.ts. */
export interface HistorialEstadoItem {
  id: string;
  estadoAnterior: string;
  estadoNuevo: string;
  usuarioId: string;
  registradoEn: Date;
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
  /** `null` si no existe o está soft-deleted — CambiarEstadoReporteCommand.ts decide ahí mismo si es 404 o una transición válida. */
  obtenerEstadoActual(id: string): Promise<string | null>;
  /** UPDATE + INSERT en `reportes_historial_estado` en una misma transacción (docs/SCHEMA.md). */
  actualizarEstado(reporteId: string, estadoNuevo: string, actualizadoPor: string): Promise<ReporteEstadoActualizado>;
  /** `reportadoPor` del reporte, o `null` si no existe o está soft-deleted — ver ListarHistorialReporte.ts. */
  obtenerPropietario(id: string): Promise<string | null>;
  /** Historial completo de transiciones, ordenado cronológicamente por `registrado_en` (ascendente). */
  listarHistorialEstado(reporteId: string): Promise<HistorialEstadoItem[]>;
}
