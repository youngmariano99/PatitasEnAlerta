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
}

/**
 * Puerto hacia la persistencia de reportes. CrearReporte depende únicamente
 * de esta abstracción — nunca de Prisma directamente.
 */
export interface IRepositorioReportes {
  crear(datos: DatosNuevoReporte): Promise<Reporte>;
}
