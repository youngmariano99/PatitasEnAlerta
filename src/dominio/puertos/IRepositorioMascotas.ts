import type { DatosMascota, Mascota } from '@dominio/entidades/Mascota';

export type CambiosMascota = Partial<Omit<DatosMascota, 'dueñoId'>>;

/**
 * Puerto hacia la persistencia de mascotas. El caso de uso depende
 * únicamente de esta abstracción — nunca de Prisma directamente.
 *
 * Regla no negociable (soft delete): toda lectura (`buscarPorId`,
 * `listarPorDueño`) filtra siempre `deleted_at IS NULL`. La baja NUNCA es un
 * DELETE físico — `darDeBaja` hace `UPDATE mascotas SET deleted_at = now()`.
 */
export interface IRepositorioMascotas {
  crear(datos: DatosMascota): Promise<Mascota>;
  buscarPorId(id: string): Promise<Mascota | null>;
  listarPorDueño(dueñoId: string): Promise<Mascota[]>;
  actualizar(id: string, cambios: CambiosMascota): Promise<Mascota>;
  darDeBaja(id: string): Promise<void>;
}
