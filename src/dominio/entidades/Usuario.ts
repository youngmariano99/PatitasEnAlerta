// Catálogo de roles (docs/SEED.md): 1=dueño, 2=veterinario, 3=municipio,
// 4=administrador, 5=rescatista (Post-MVP, Módulo 5), 6=comerciante, 7=organizacion.
export const ROL_DUENO_ID = 1;
export const ROL_RESCATISTA_ID = 5;

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

  /**
   * Rescatista/Activista (docs/ROLES.md, Módulo 5): autoregistro sin perfil
   * adicional y sin verificación profesional — mismo shape que el dueño,
   * solo cambia el rol_id asignado.
   */
  static registrarRescatista(id: string, email: string): Usuario {
    return new Usuario(id, Usuario.normalizarEmail(email), ROL_RESCATISTA_ID);
  }

  private static normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
