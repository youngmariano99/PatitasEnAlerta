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

/** Criterios de búsqueda de EvaluarCoincidenciaReporte (REP-U-06). */
export interface CriteriosCoincidenciaReporte {
  especie: string;
  latitud: number;
  longitud: number;
  /** Radio de búsqueda alrededor de (latitud, longitud), en kilómetros. */
  radioKm: number;
  /** El propio reporte 'encontrado' recién creado nunca es candidato de sí mismo. */
  excluirReporteId: string;
}

/** Proyección mínima de un reporte 'perdido' activo, suficiente para notificar a quien lo publicó. */
export interface ReporteActivoResumen {
  id: string;
  reportadoPor: string;
}

/**
 * Puerto hacia la persistencia de reportes. CrearReporte y
 * EvaluarCoincidenciaReporte dependen únicamente de esta abstracción — nunca
 * de Prisma directamente.
 */
export interface IRepositorioReportes {
  crear(datos: DatosNuevoReporte): Promise<Reporte>;
  /** Reportes 'perdido' activos (docs/entidades/Reporte.ts, ESTADOS_REPORTE_ACTIVOS) dentro del radio y de la misma especie. */
  buscarPerdidosActivosPorZonaYEspecie(criterios: CriteriosCoincidenciaReporte): Promise<ReporteActivoResumen[]>;
}
