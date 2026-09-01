export interface DatosFranjaTurno {
  franjaInicio: Date;
  franjaFin: Date;
}

/**
 * Strategy (GoF, PLANIFICACION.md Sección 4 — "el corazón del Motor de
 * Turnera compartido"): cada proveedor sabe calcular, a partir de SU propia
 * fuente de disponibilidad, qué franjas horarias tendrían que existir como
 * turnos. `TurneraMunicipio` (esta actividad) las deriva de
 * `eventos.cupos_totales`; una futura `TurneraVeterinario` (Módulo 4) las
 * derivará de `disponibilidad_veterinario` — misma interfaz, fuente
 * distinta. La persistencia/reconciliación (qué franjas ya existen, cuáles
 * faltan generar, nunca tocar `reservado`/`cancelado`) es genérica y vive en
 * GenerarTurnosEvento.ts + IRepositorioTurnos, no en cada estrategia.
 */
export interface ProveedorTurnera<TFuente> {
  readonly proveedorTipo: 'municipio' | 'veterinario';
  calcularFranjasObjetivo(fuente: TFuente): DatosFranjaTurno[];
}

/** Datos de un evento municipal necesarios para calcular sus franjas de turno. */
export interface FuenteDisponibilidadEvento {
  fecha: Date;
  cuposTotales: number;
}

/** Duración de cada cupo — mismo criterio que el bloque de turnos de docs/SEED.md (franjas de 20 minutos). */
const DURACION_TURNO_MINUTOS = 20;
const MINUTOS_EN_MS = 60_000;

/**
 * Implementación concreta del Motor de Turnera para operativos municipales
 * (Módulo 3). Un evento con `cupos_totales = N` se traduce en N franjas
 * secuenciales de `DURACION_TURNO_MINUTOS`, arrancando en `evento.fecha` —
 * cada una es, en los hechos, un cupo reservable de forma independiente por
 * un vecino distinto.
 */
export class TurneraMunicipio implements ProveedorTurnera<FuenteDisponibilidadEvento> {
  readonly proveedorTipo = 'municipio' as const;

  calcularFranjasObjetivo(fuente: FuenteDisponibilidadEvento): DatosFranjaTurno[] {
    const duracionMs = DURACION_TURNO_MINUTOS * MINUTOS_EN_MS;

    return Array.from({ length: fuente.cuposTotales }, (_, indice) => {
      const franjaInicio = new Date(fuente.fecha.getTime() + indice * duracionMs);
      return { franjaInicio, franjaFin: new Date(franjaInicio.getTime() + duracionMs) };
    });
  }
}
