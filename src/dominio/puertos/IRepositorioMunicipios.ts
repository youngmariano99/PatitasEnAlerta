import type { PerfilMunicipio } from '@dominio/entidades/PerfilMunicipio';

export interface DatosNuevoMunicipio {
  /** Igual al id ya emitido por el proveedor de autenticación (auth.uid()). */
  id: string;
  email: string;
  nombreInstitucional: string;
}

/**
 * Puerto hacia la persistencia del alta institucional. La implementación
 * tiene que insertar `usuarios` + `perfiles_municipio` en una única
 * transacción — nunca como dos escrituras independientes.
 */
export interface IRepositorioMunicipios {
  crear(datos: DatosNuevoMunicipio): Promise<PerfilMunicipio>;
}
