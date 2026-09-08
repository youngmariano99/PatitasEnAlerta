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
 * Puerto hacia `autorizaciones_libreta` (Módulo 4). `RegistrarEntradaLibreta.ts`
 * depende de `obtenerActual` para decidir si el veterinario autenticado
 * puede escribir en la libreta de una mascota puntual — mismo criterio que
 * la RLS `autorizado_sobre_mascota()` (docs/ROLES.md). El alta/listado/
 * revocación (Historia "Control de accesos a la libreta", VET-05) son casos
 * de uso propios del dueño — `AutorizarVeterinario.ts`,
 * `ListarAutorizacionesLibreta.ts`, `RevocarAutorizacionLibreta.ts` — que
 * dependen del resto de estos métodos.
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

  /**
   * Inserta una nueva fila de autorización (nunca upsert): `ux_autorizacion_activa`
   * (docs/SCHEMA.md) permite múltiples filas históricas revocadas para el
   * mismo par, solo exige unicidad mientras `revocadaEn IS NULL`. El caso de
   * uso (`AutorizarVeterinario.ts`) verifica con `obtenerActual` que no haya
   * ya una activa ANTES de llamar a este método, para devolver un error de
   * negocio (PEA-VET-009) en vez de dejar reventar la constraint de la base.
   */
  crear(mascotaId: string, veterinarioId: string): Promise<AutorizacionLibretaPersistida>;

  /**
   * Marca `revocadaEn = now()` sobre la autorización actualmente activa de
   * ese par. `null` si no hay ninguna activa (nunca se autorizó, o ya estaba
   * revocada) — `RevocarAutorizacionLibreta.ts` lo traduce a PEA-VET-010 (404).
   */
  revocar(mascotaId: string, veterinarioId: string): Promise<AutorizacionLibretaPersistida | null>;

  /** Historial completo (vigentes y revocadas) de una mascota, más reciente primero — auditoría exigida por VET-05. */
  listarPorMascota(mascotaId: string): Promise<AutorizacionLibretaPersistida[]>;
}
