export interface CredencialesRegistro {
  email: string;
  password: string;
}

export interface UsuarioAutenticado {
  id: string;
  email: string;
}

/**
 * Puerto hacia el proveedor de identidad (Supabase Auth en infraestructura).
 * El dominio no conoce SDKs de terceros — solo esta abstracción (patrón
 * Adapter, ver PLANIFICACION.md Sección 4.2).
 */
export interface IProveedorAutenticacion {
  /** Da de alta las credenciales y retorna el id que será también usuarios.id (auth.uid()). */
  registrarCredenciales(datos: CredencialesRegistro): Promise<UsuarioAutenticado>;

  /** Revierte un alta de credenciales (compensación si falla el paso siguiente de persistencia). */
  eliminarCredenciales(id: string): Promise<void>;

  /**
   * Dispara el email de recuperación de contraseña de Supabase Auth.
   * Contrato de este puerto: NUNCA rechaza la promesa — ni cuando el email
   * no pertenece a ninguna cuenta ni ante una falla real del proveedor
   * (queda logueada por la implementación). Es la base del comportamiento
   * anti-enumeración exigido en AUTH-06: el llamador no tiene ninguna rama
   * de error que lo tiente a responder distinto según el caso.
   */
  solicitarRecuperacionPassword(email: string, redirectTo: string): Promise<void>;
}
