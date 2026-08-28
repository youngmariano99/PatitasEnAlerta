import type { DatosMascota, Mascota } from '@dominio/entidades/Mascota';

/**
 * Puerto hacia la persistencia de mascotas. El caso de uso depende
 * únicamente de esta abstracción — nunca de Prisma directamente.
 */
export interface IRepositorioMascotas {
  crear(datos: DatosMascota): Promise<Mascota>;
}
