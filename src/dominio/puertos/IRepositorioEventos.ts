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
 * Puerto hacia la persistencia de operativos municipales (Módulo 3).
 * CrearEvento depende únicamente de esta abstracción — nunca de Prisma
 * directamente (mismo criterio que IRepositorioReportes).
 */
export interface IRepositorioEventos {
  crear(datos: DatosNuevoEvento): Promise<Evento>;
}
