import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/** Código y mensaje copiados textualmente de docs/ERRORS.md — Módulo 1. */
export class VerificacionYaResueltaError extends ErrorDominio {
  constructor() {
    super(
      'PEA-AUTH-013',
      'Esta verificación ya fue resuelta anteriormente. Actualizá la lista para ver el estado actual.',
      409,
    );
  }
}
