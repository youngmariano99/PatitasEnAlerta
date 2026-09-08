/** Estado de autorización de un veterinario sobre la libreta sanitaria de una mascota (docs/SCHEMA.md, `autorizaciones_libreta`). */
export interface AutorizacionLibretaPersistida {
  id: string;
  mascotaId: string;
  veterinarioId: string;
  otorgadaEn: Date;
  /** `null` = vigente. No-`null` = el dueño la revocó en ese momento (docs/ERRORS.md PEA-VET-004). */
  revocadaEn: Date | null;
}

/**
 * Puerto de solo lectura hacia `autorizaciones_libreta` (Módulo 4, Historia
 * "Registro de entrada en la libreta sanitaria"). `RegistrarEntradaLibreta.ts`
 * depende únicamente de esta abstracción para decidir si el veterinario
 * autenticado puede escribir en la libreta de una mascota puntual — mismo
 * criterio que la RLS `autorizado_sobre_mascota()` (docs/ROLES.md).
 *
 * El alta/revocación de autorizaciones (Historia "Control de accesos a la
 * libreta", VET-05) es un caso de uso propio del dueño, fuera de este
 * ticket — este puerto solo expone la lectura que necesita la escritura de
 * entradas.
 */
export interface IRepositorioAutorizacionesLibreta {
  /**
   * Autorización más reciente entre `mascotaId` y `veterinarioId`, vigente o
   * revocada. `null` si el dueño nunca autorizó a ese veterinario para esa
   * mascota (PEA-VET-003). Si la más reciente tiene `revocadaEn` distinto de
   * `null`, el acceso está actualmente revocado (PEA-VET-004) aunque haya
   * habido una autorización activa en el pasado.
   */
  obtenerActual(mascotaId: string, veterinarioId: string): Promise<AutorizacionLibretaPersistida | null>;
}
