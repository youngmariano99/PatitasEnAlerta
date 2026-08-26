import type { Usuario } from '@dominio/entidades/Usuario';

/**
 * Puerto (interfaz segregada) hacia la persistencia de usuarios. Los casos de
 * uso dependen únicamente de esta abstracción — nunca de Prisma directamente
 * (Clean Architecture, ver CLAUDE.md / PLANIFICACION.md Sección 4.1).
 */
export interface IRepositorioUsuarios {
  /** true si existe un usuario activo (deleted_at IS NULL) con ese email. */
  existePorEmailActivo(email: string): Promise<boolean>;

  /** Persiste el usuario. El id debe coincidir con el id ya emitido por el proveedor de autenticación. */
  crear(usuario: Usuario): Promise<Usuario>;
}
