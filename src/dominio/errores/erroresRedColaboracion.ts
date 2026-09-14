import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 5
 * (Red de Colaboración, Post-MVP). PEA-RED-005 y PEA-RED-006 se agregaron al
 * catálogo junto con la actividad "Vista de seguimiento de colaboraciones"
 * (ver docs/DECISIONES.md) porque ninguno de los dos casos ("colaboración
 * inexistente", "transición de estado inválida") tenía código propio.
 * PEA-RED-001/002/003 ya estaban en el catálogo desde la publicación de
 * solicitudes de recurso, pero sin ninguna clase que los implementara hasta
 * OfrecerseComoColaboradorCommand.ts — PEA-RED-003 está redactado
 * específicamente para "esa solicitud" (no para una colaboración, que usa
 * PEA-RED-005).
 */
export class ColaboracionNoEncontradaError extends ErrorDominio {
  constructor() {
    super('PEA-RED-005', 'No encontramos esa colaboración o ya no está disponible.', 404);
  }
}

export class SoloOrganizacionActualizaColaboracionError extends ErrorDominio {
  constructor() {
    super('PEA-RED-004', 'Solo la organización que publicó la solicitud puede aceptar o rechazar colaboraciones.', 403);
  }
}

export class CambioDeEstadoColaboracionInvalidoError extends ErrorDominio {
  constructor() {
    super('PEA-RED-006', 'Ese cambio de estado no es válido para esta colaboración.', 409);
  }
}

export class SolicitudNoEncontradaError extends ErrorDominio {
  constructor() {
    super('PEA-RED-003', 'No encontramos esa solicitud o ya no está disponible.', 404);
  }
}

export class SolicitudYaCubiertaError extends ErrorDominio {
  constructor() {
    super('PEA-RED-001', 'Esta solicitud ya fue cubierta por otra persona.', 409);
  }
}

export class ColaboracionYaPropuestaError extends ErrorDominio {
  constructor() {
    super('PEA-RED-002', 'Ya te ofreciste como colaborador/a en esta solicitud.', 409);
  }
}
