import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 3.
 * No modificar el mensaje acá sin actualizar primero el catálogo.
 */
export class FechaEventoPasadaError extends ErrorDominio {
  constructor() {
    super('PEA-MUN-004', 'La fecha del evento tiene que ser posterior a hoy.', 400);
  }
}

export class SoloMunicipioAdministraEventosError extends ErrorDominio {
  constructor() {
    super('PEA-MUN-005', 'Solo cuentas municipales pueden administrar eventos y la vitrina de adopción.', 403);
  }
}
