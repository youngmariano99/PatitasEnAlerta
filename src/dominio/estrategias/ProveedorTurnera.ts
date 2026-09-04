export interface DatosFranjaTurno {
  franjaInicio: Date;
  franjaFin: Date;
}

/**
 * Strategy (GoF, PLANIFICACION.md Sección 4 — "el corazón del Motor de
 * Turnera compartido"): cada proveedor sabe calcular, a partir de SU propia
 * fuente de disponibilidad, qué franjas horarias tendrían que existir como
 * turnos. `TurneraMunicipio` (Módulo 3) las deriva de `eventos.cupos_totales`;
 * `TurneraVeterinario` (Módulo 4) las deriva de `disponibilidad_veterinario`
 * — misma interfaz, fuente distinta. La persistencia/reconciliación (qué
 * franjas ya existen, cuáles faltan generar, nunca tocar
 * `reservado`/`cancelado`) es genérica y vive en GenerarTurnosEvento.ts /
 * GenerarTurnosVeterinario.ts + IRepositorioTurnos, no en cada estrategia.
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

/** Un bloque semanal recurrente ya configurado (`disponibilidad_veterinario`, `activo=true`). `horaInicio`/`horaFin` en formato `HH:mm` — la columna de origen es `TIME`, sin fecha asociada. */
export interface BloqueDisponibilidadVeterinario {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

/**
 * Fuente de disponibilidad de un veterinario: sus bloques semanales activos
 * más el horizonte concreto (fecha de inicio + cantidad de días) sobre el
 * que hay que proyectarlos en franjas de turno reales.
 */
export interface FuenteDisponibilidadVeterinario {
  bloquesActivos: BloqueDisponibilidadVeterinario[];
  /** Medianoche UTC del primer día a proyectar. */
  desde: Date;
  horizonteDias: number;
}

/**
 * Implementación concreta del Motor de Turnera para agendas de veterinario
 * (Módulo 4). A diferencia de `TurneraMunicipio` (una fecha puntual con N
 * cupos secuenciales), acá la fuente es recurrente: cada bloque semanal
 * (`diaSemana` + rango horario) se repite una vez por cada ocurrencia de ese
 * día de la semana dentro del horizonte, y cada ocurrencia se corta en
 * franjas de `DURACION_TURNO_MINUTOS` — mismo tamaño de cupo que la turnera
 * municipal, para que ambas compartan `IRepositorioTurnos` sin distinción.
 */
/** "HH:mm" → minutos desde medianoche. `Number(undefined)` sería `NaN`, pero `PATRON_HORA` (ConfigurarDisponibilidadDto.ts) ya garantiza el formato antes de que una franja llegue a persistirse. */
function minutosDesdeMedianoche(hora: string): number {
  const partes = hora.split(':');
  return Number(partes[0]) * 60 + Number(partes[1]);
}

export class TurneraVeterinario implements ProveedorTurnera<FuenteDisponibilidadVeterinario> {
  readonly proveedorTipo = 'veterinario' as const;

  calcularFranjasObjetivo(fuente: FuenteDisponibilidadVeterinario): DatosFranjaTurno[] {
    const duracionMs = DURACION_TURNO_MINUTOS * MINUTOS_EN_MS;
    const franjas: DatosFranjaTurno[] = [];

    for (let offsetDias = 0; offsetDias < fuente.horizonteDias; offsetDias++) {
      const fechaMs = fuente.desde.getTime() + offsetDias * 24 * 60 * MINUTOS_EN_MS;
      const diaSemana = new Date(fechaMs).getUTCDay();

      for (const bloque of fuente.bloquesActivos) {
        if (bloque.diaSemana !== diaSemana) continue;

        const inicioBloqueMs = fechaMs + minutosDesdeMedianoche(bloque.horaInicio) * MINUTOS_EN_MS;
        const finBloqueMs = fechaMs + minutosDesdeMedianoche(bloque.horaFin) * MINUTOS_EN_MS;

        for (let cursor = inicioBloqueMs; cursor + duracionMs <= finBloqueMs; cursor += duracionMs) {
          franjas.push({ franjaInicio: new Date(cursor), franjaFin: new Date(cursor + duracionMs) });
        }
      }
    }

    return franjas;
  }
}
