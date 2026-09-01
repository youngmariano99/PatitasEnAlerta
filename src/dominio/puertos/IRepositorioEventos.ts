import type { Evento } from '@dominio/entidades/Evento';

export interface DatosNuevoEvento {
  municipioId: string;
  titulo: string;
  tipo: string;
  direccion: string;
  latitud: number;
  longitud: number;
  fecha: Date;
  cuposTotales: number;
  requisitos: string | null;
}

/**
 * Filtros del calendario público de operativos (Historia "Calendario
 * público de operativos", ListarEventosPublico.ts). `tipo` es opcional
 * (sin él, se listan todos los tipos); `fechaDesde`/`fechaHasta` filtran
 * sobre `eventos.fecha` (el operativo en sí), no sobre `created_at` —
 * a diferencia de FiltrosListadoReportes, acá es lo que le interesa a un
 * calendario: "qué operativos hay en este rango de fechas".
 */
export interface FiltrosListadoEventos {
  tipo?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

/** Proyección pública de un evento — mismos campos que Evento, sin distinción (no hay datos sensibles que ocultar acá). */
export interface EventoListado {
  id: string;
  municipioId: string;
  titulo: string;
  tipo: string;
  direccion: string;
  latitud: number;
  longitud: number;
  fecha: Date;
  cuposTotales: number;
  requisitos: string | null;
}

export interface PaginaEventos {
  items: EventoListado[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Puerto hacia la persistencia de operativos municipales (Módulo 3).
 * CrearEvento/ListarEventosPublico dependen únicamente de esta abstracción
 * — nunca de Prisma directamente (mismo criterio que IRepositorioReportes).
 */
export interface IRepositorioEventos {
  crear(datos: DatosNuevoEvento): Promise<Evento>;
  /** Listado público paginado (tope 50) de operativos activos (`deleted_at IS NULL`), ordenado por fecha ascendente. */
  listar(filtros: FiltrosListadoEventos, pagina: number, porPagina: number): Promise<PaginaEventos>;
}
