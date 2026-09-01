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

/** Proyección mínima leída antes de intentar la reserva — ver ReservarTurnoCommand.ts. */
export interface TurnoActual {
  id: string;
  estado: string;
  version: number;
}

/** Resultado de una reserva exitosa. */
export interface TurnoReservado {
  id: string;
  estado: string;
  reservadoPor: string;
  version: number;
}

/**
 * Puerto hacia la persistencia del Motor de Turnera compartido (Módulo 3 y,
 * a futuro, Módulo 4) — genérico sobre `proveedorTipo`, nunca conoce si
 * quien lo llama es municipio o veterinario. GenerarTurnosEvento.ts/
 * ReservarTurnoCommand.ts dependen únicamente de esta abstracción, nunca de
 * Prisma directamente.
 */
export interface IRepositorioTurnos {
  /** Turnos en estado 'disponible' ya persistidos para ese evento (nunca cuenta reservado/cancelado). */
  contarDisponiblesPorEvento(eventoId: string): Promise<number>;
  /** Inserta el lote completo; no-op (devuelve `[]`) si `turnos` viene vacío. */
  crearLote(turnos: DatosNuevoTurno[]): Promise<TurnoGenerado[]>;
  /** `null` si no existe o está soft-deleted (`deleted_at IS NOT NULL`) — ReservarTurnoCommand.ts decide ahí mismo si es 404. */
  obtenerActual(turnoId: string): Promise<TurnoActual | null>;
  /**
   * Control optimista de concurrencia (docs/SCHEMA.md): `UPDATE turnos SET
   * estado='reservado', version=version+1, reservado_por=? WHERE id=? AND
   * estado='disponible' AND version=?`. `versionEsperada` es la leída por
   * `obtenerActual` inmediatamente antes — si 0 filas se ven afectadas
   * (alguien ganó la carrera entre esa lectura y este UPDATE, o el turno ya
   * no está 'disponible'), devuelve `null`. Nunca lanza: el caso de uso
   * decide ahí mismo que es PEA-MUN-001 (409), no un error de sistema.
   */
  reservar(turnoId: string, reservadoPor: string, versionEsperada: number): Promise<TurnoReservado | null>;
}
