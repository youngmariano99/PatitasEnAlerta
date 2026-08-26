// Catálogo de roles (docs/SCHEMA.md, Módulo 1): 1=dueño, 2=veterinario, 3=municipio, 4=administrador.
export const ROL_DUENO_ID = 1;

/**
 * Entidad de dominio Usuario. Encapsula el único invariante relevante en el
 * alta de un dueño de mascota: el email se normaliza siempre de la misma
 * forma (sin espacios, minúsculas) antes de tocar cualquier capa de
 * persistencia o proveedor de autenticación.
 */
export class Usuario {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly rolId: number,
  ) {}

  static registrarDueño(id: string, email: string): Usuario {
    return new Usuario(id, Usuario.normalizarEmail(email), ROL_DUENO_ID);
  }

  private static normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
