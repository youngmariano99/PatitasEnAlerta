import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 4.
 * No modificar el mensaje acá sin actualizar primero el catálogo.
 */

export class HoraFinAntesDeInicioError extends ErrorDominio {
  constructor() {
    super('PEA-VET-001', 'El horario de fin tiene que ser posterior al de inicio.', 400);
  }
}

/** Agenda/turnos propios exigen matrícula ya verificada — mismo criterio que la RLS `veterinario_verificado()` (docs/ROLES.md). */
export class CuentaVeterinariaNoVerificadaError extends ErrorDominio {
  constructor() {
    super(
      'PEA-VET-007',
      'Tu cuenta profesional todavía no está verificada. Esta función se habilita al confirmarse tu matrícula.',
      403,
    );
  }
}

/** Reutilizable por cualquier caso de uso que resuelva una franja de disponibilidad por id (soft delete / no encontrada / no pertenece al veterinario). */
export class DisponibilidadNoEncontradaError extends ErrorDominio {
  constructor() {
    super('PEA-VET-008', 'No encontramos esa franja de disponibilidad o ya no está activa.', 404);
  }
}
