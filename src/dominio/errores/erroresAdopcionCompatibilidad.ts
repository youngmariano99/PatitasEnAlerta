import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 9
 * (Algoritmo de Compatibilidad de Adopción, Post-MVP). Se activan en la
 * actividad "CRUD de cuestionarios_adoptante propio del usuario".
 */

/** Paso 3 del ticket: el cuestionario no tiene los 4 campos de estilo de vida completos — ver `esCuestionarioCompleto` en `@dominio/entidades/CuestionarioAdoptante`. */
export class CuestionarioIncompletoError extends ErrorDominio {
  constructor() {
    super(
      'PEA-ADOP-001',
      'Completá el cuestionario para recibir sugerencias de compatibilidad.',
      400,
    );
  }
}

/** El usuario nunca completó un cuestionario (o está soft-deleted) — anti-enumeración, mismo criterio que el resto de los "no encontrado" del proyecto. */
export class CuestionarioNoEncontradoError extends ErrorDominio {
  constructor() {
    super('PEA-ADOP-003', 'No encontramos tu cuestionario de adopción.', 404);
  }
}
