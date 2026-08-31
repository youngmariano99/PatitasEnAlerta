export interface DatosReporte {
  tipo: string;
  subtipo: string | null;
  reportadoPor: string;
  mascotaId: string | null;
  descripcion: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  especie: string | null;
  estado: string;
}

/** Todos los estados válidos de un reporte (docs/SCHEMA.md, CHECK estado). */
export const ESTADOS_REPORTE_SOPORTADOS = ['reportado', 'en_revision', 'en_atencion', 'resuelto', 'cerrado'] as const;
export type EstadoReporte = (typeof ESTADOS_REPORTE_SOPORTADOS)[number];

/**
 * Estados de un reporte que todavía representan un caso abierto. Único
 * criterio de "activo" reutilizado tanto por EvaluarCoincidenciaReporte
 * (solo matchea contra 'perdido' activos) como por ListarReportes (filtro
 * por defecto del listado público cuando no se pide un `estado` puntual).
 */
export const ESTADOS_REPORTE_ACTIVOS = ['reportado', 'en_revision', 'en_atencion'] as const;

/**
 * Máquina de estados (State, PLANIFICACION.md Sección 4.2) de un reporte:
 * progresión lineal reportado → en_revision → en_atencion → resuelto, con
 * la posibilidad de cerrar desde cualquier estado no terminal (ej. un
 * reporte descartado por duplicado o sin sustento). `cerrado` es terminal —
 * ninguna transición sale de ahí. Único punto de verdad de "qué transición
 * es válida", usado tanto por ActualizarEstadoReporte.ts (PEA-REP-006) como
 * por PanelReportesMunicipio.tsx para no ofrecer en la UI un estado que el
 * backend va a rechazar.
 */
export const TRANSICIONES_VALIDAS_REPORTE: Readonly<Record<EstadoReporte, readonly EstadoReporte[]>> = {
  reportado: ['en_revision', 'cerrado'],
  en_revision: ['en_atencion', 'cerrado'],
  en_atencion: ['resuelto', 'cerrado'],
  resuelto: ['cerrado'],
  cerrado: [],
};

/**
 * Entidad de dominio Reporte. Representa siempre un reporte ya persistido
 * (con `id` y `createdAt`) — el alta se modela con `DatosReporte` (sin id)
 * en el puerto del repositorio, mismo criterio que Mascota.ts.
 */
export class Reporte {
  private constructor(
    public readonly id: string,
    public readonly tipo: string,
    public readonly subtipo: string | null,
    public readonly reportadoPor: string,
    public readonly mascotaId: string | null,
    public readonly descripcion: string,
    public readonly fotoUrl: string,
    public readonly latitud: number,
    public readonly longitud: number,
    public readonly especie: string | null,
    public readonly estado: string,
    public readonly createdAt: Date,
  ) {}

  static reconstruir(id: string, datos: DatosReporte, createdAt: Date): Reporte {
    return new Reporte(
      id,
      datos.tipo,
      datos.subtipo,
      datos.reportadoPor,
      datos.mascotaId,
      datos.descripcion,
      datos.fotoUrl,
      datos.latitud,
      datos.longitud,
      datos.especie,
      datos.estado,
      createdAt,
    );
  }
}
