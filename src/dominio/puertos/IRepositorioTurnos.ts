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
 * Proyección mínima leída antes de intentar reservar/cancelar/reprogramar —
 * ver ReservarTurnoCommand.ts/CancelarTurnoCommand.ts/ReprogramarTurnoCommand.ts.
 * `reservadoPor`/`proveedorId` son los que CancelarTurnoCommand.autorizar()
 * usa para el chequeo "reservado_por=usuario_actual() (o proveedor_id)"
 * (Paso 1 del ticket "Cancelación o reprogramación de turno propio").
 */
export interface TurnoActual {
  id: string;
  estado: string;
  version: number;
  reservadoPor: string | null;
  proveedorId: string;
}

/** Resultado de una reserva exitosa. */
export interface TurnoReservado {
  id: string;
  estado: string;
  reservadoPor: string;
  version: number;
}

/**
 * Resultado de una cancelación exitosa. `reservadoPor` se conserva TAL CUAL
 * estaba (nunca se limpia a `null`) — a propósito: es lo que mantiene
 * funcionando la suscripción Realtime de "Mis turnos"
 * (app/turnos/mis-turnos/page.tsx, filtro `reservado_por=eq.<usuarioId>`)
 * cuando el proveedor cancela un turno ajeno, y preserva quién había
 * reservado para auditoría/histórico.
 */
export interface TurnoCancelado {
  id: string;
  estado: string;
  reservadoPor: string | null;
  proveedorId: string;
  version: number;
}

/** Resultado de una reprogramación exitosa — ambos turnos, dentro de la misma transacción Prisma (Paso 2 del ticket). */
export interface TurnoReprogramado {
  turnoCancelado: TurnoCancelado;
  turnoReservado: TurnoReservado;
}

/** Proyección de "mis turnos" — `eventoTitulo` es `null` para turnos de proveedor 'veterinario' (`evento_id IS NULL`, docs/SCHEMA.md). */
export interface TurnoPropio {
  id: string;
  proveedorTipo: string;
  proveedorId: string;
  eventoId: string | null;
  eventoTitulo: string | null;
  franjaInicio: Date;
  franjaFin: Date;
  estado: string;
}

export interface PaginaTurnosPropios {
  items: TurnoPropio[];
  total: number;
  pagina: number;
  porPagina: number;
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
  /** "Mis turnos" (Historia "Monitoreo en tiempo real del turno reservado"): paginado (tope 50), filtrado exclusivamente por `reservado_por`, orden por `franja_inicio` ascendente (el próximo turno primero). */
  listarPropios(reservadoPor: string, pagina: number, porPagina: number): Promise<PaginaTurnosPropios>;
  /**
   * Control optimista de concurrencia, mismo criterio que `reservar`:
   * `UPDATE turnos SET estado='cancelado', version=version+1 WHERE id=? AND
   * estado='reservado' AND version=?` (Paso 1 del ticket). `null` si 0
   * filas afectadas — el turno ya no estaba 'reservado' con esa `version`
   * (no encontrado, soft-deleted, o ya cancelado por otra request). El
   * caso de uso decide ahí mismo que es PEA-MUN-003 (404), nunca un error
   * de sistema.
   */
  cancelar(turnoId: string, versionEsperada: number): Promise<TurnoCancelado | null>;
  /**
   * Reprogramación (Paso 2): cancela `turnoActualId` y reserva
   * `turnoNuevoId` para el mismo `usuarioId`, ambos pasos dentro de una
   * única transacción Prisma (`$transaction`) — todo o nada. `null` si
   * cualquiera de los dos pasos falla (0 filas afectadas): la transacción
   * completa se revierte, el turno actual NUNCA queda cancelado sin que el
   * nuevo haya quedado reservado.
   */
  reprogramar(
    turnoActualId: string,
    turnoNuevoId: string,
    usuarioId: string,
    versionActualEsperada: number,
    versionNuevaEsperada: number,
  ): Promise<TurnoReprogramado | null>;
  /**
   * Franjas (`franja_inicio`) ya persistidas para ese proveedor dentro de
   * `[desde, hasta)`, sin importar `estado` — `GenerarTurnosVeterinario.ts`
   * la usa para no duplicar turnos ya generados en una corrida previa, ya
   * que a diferencia de un evento (identificado por `evento_id`, reconciliado
   * por conteo en `GenerarTurnosEvento.ts`) un veterinario no tiene una
   * referencia externa por la que contar: la propia franja horaria es la
   * identidad de reconciliación.
   */
  listarFranjasExistentes(proveedorId: string, desde: Date, hasta: Date): Promise<Date[]>;
}
