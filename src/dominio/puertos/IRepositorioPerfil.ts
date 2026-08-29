export interface ResumenPerfilPropio {
  id: string;
  email: string;
  /** Nombre del rol (docs/SCHEMA.md: 'dueño'|'veterinario'|'municipio'|'administrador'). */
  rol: string;
  estadoVerificacion: string;
  /** Solo veterinarios: momento en que se aprobó la matrícula. Null en cualquier otro caso. */
  verificadoEn: Date | null;
}

/** Puerto de solo lectura para el resumen de perfil del usuario autenticado. */
export interface IRepositorioPerfil {
  obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null>;
}
