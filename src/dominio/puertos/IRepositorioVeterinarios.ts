import type { PerfilVeterinario } from '@dominio/entidades/PerfilVeterinario';

export interface DatosNuevoVeterinario {
  /** Igual al id ya emitido por el proveedor de autenticación (auth.uid()). */
  id: string;
  email: string;
  matricula: string;
  colegioEmisor: string;
}

/**
 * Puerto hacia la persistencia del alta de veterinario. La implementación
 * tiene que insertar `usuarios` + `perfiles_veterinario` + `verificaciones`
 * en una única transacción — nunca como tres escrituras independientes.
 */
export interface IRepositorioVeterinarios {
  crear(datos: DatosNuevoVeterinario): Promise<PerfilVeterinario>;
}
