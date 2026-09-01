export interface DatosNuevoTurno {
  proveedorTipo: string;
  proveedorId: string;
  eventoId: string | null;
  franjaInicio: Date;
  franjaFin: Date;
}

export interface TurnoGenerado {
  id: string;
  proveedorTipo: string;
  proveedorId: string;
  eventoId: string | null;
  franjaInicio: Date;
  franjaFin: Date;
  estado: string;
}

/**
 * Puerto hacia la persistencia del Motor de Turnera compartido (Módulo 3 y,
 * a futuro, Módulo 4) — genérico sobre `proveedorTipo`, nunca conoce si
 * quien lo llama es municipio o veterinario. GenerarTurnosEvento.ts depende
 * únicamente de esta abstracción, nunca de Prisma directamente.
 */
export interface IRepositorioTurnos {
  /** Turnos en estado 'disponible' ya persistidos para ese evento (nunca cuenta reservado/cancelado). */
  contarDisponiblesPorEvento(eventoId: string): Promise<number>;
  /** Inserta el lote completo; no-op (devuelve `[]`) si `turnos` viene vacío. */
  crearLote(turnos: DatosNuevoTurno[]): Promise<TurnoGenerado[]>;
}
