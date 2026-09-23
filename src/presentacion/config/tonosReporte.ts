import type { TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';

/**
 * Tono de `Badge` según el `tipo` de un reporte — único punto de verdad,
 * reutilizado por `app/reportes/page.tsx`, `app/page.tsx` (home) y
 * `ResultadosCercanosTrasPublicar.tsx` (los 3 lugares que muestran una
 * tarjeta de reporte con su tipo como Badge).
 */
export const TONO_POR_TIPO_REPORTE: Record<TipoReporte, 'peligro' | 'exito' | 'alerta'> = {
  perdido: 'peligro',
  encontrado: 'exito',
  problematica: 'alerta',
};
