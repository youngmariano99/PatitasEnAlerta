/** Fila de `historiales_compartidos` (docs/SCHEMA.md, Módulo 6). Nunca soft delete: `revocadoEn` no-`null` preserva el registro para auditoría, nunca lo borra. */
export interface HistorialCompartido {
  id: string;
  mascotaId: string;
  veterinarioOrigenId: string;
  veterinarioDestinoId: string;
  autorizadoEn: Date;
  revocadoEn: Date | null;
}

export interface DatosCompartirHistorial {
  mascotaId: string;
  veterinarioOrigenId: string;
  veterinarioDestinoId: string;
}

/**
 * Puerto hacia `historiales_compartidos` (Módulo 6, Historia "Historia
 * clínica interoperable entre veterinarios"). `CompartirHistorial.ts` y
 * `RevocarHistorialCompartido.ts` dependen únicamente de esta abstracción.
 */
export interface IRepositorioHistorialesCompartidos {
  crear(datos: DatosCompartirHistorial): Promise<HistorialCompartido>;

  /** El historial con ese id, exista o no vigente. `null` si el id no corresponde a ninguna fila. */
  obtenerActual(id: string): Promise<HistorialCompartido | null>;

  /** Todos los historiales que `veterinarioOrigenId` compartió (vigentes y revocados) — para la vista "mis historiales compartidos". */
  listarPorOrigen(veterinarioOrigenId: string): Promise<HistorialCompartido[]>;

  /**
   * Marca `revocado_en = now()` sobre la fila, condicionado a
   * `id + veterinario_origen_id + revocado_en IS NULL` en la misma
   * sentencia (nunca un UPDATE incondicional sobre un id leído antes) —
   * `null` si ya no hay ninguna fila vigente que matchee ese id y ese
   * origen (no existe, no es del origen que invoca, o ya estaba revocada),
   * mismo criterio que `IRepositorioAutorizacionesLibreta.revocar`.
   */
  revocar(id: string, veterinarioOrigenId: string): Promise<HistorialCompartido | null>;
}
