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

/** El dueño nunca autorizó a este veterinario para esta mascota — `autorizaciones_libreta` no tiene ninguna fila para el par (mascotaId, veterinarioId). */
export class SinAutorizacionLibretaError extends ErrorDominio {
  constructor() {
    super(
      'PEA-VET-003',
      'No tenés autorización del dueño para escribir en la libreta sanitaria de esta mascota.',
      403,
    );
  }
}

/** Hubo una autorización, pero el dueño la revocó (`autorizaciones_libreta.revocada_en` no nulo) — distinto de "nunca autorizó" (PEA-VET-003) según docs/ERRORS.md. */
export class AutorizacionLibretaRevocadaError extends ErrorDominio {
  constructor() {
    super('PEA-VET-004', 'El dueño de esta mascota revocó tu acceso a su libreta sanitaria.', 403);
  }
}

/** La mascota no existe (o está soft-deleted) — mensaje deliberadamente genérico (anti-IDOR, docs/ERRORS.md). */
export class MascotaSinAccesoLibretaError extends ErrorDominio {
  constructor() {
    super('PEA-VET-005', 'No encontramos esa mascota o no tenés acceso a su información.', 404);
  }
}

/** `tipo` fuera de ('vacuna','visita','observacion') — docs/ERRORS.md lo marca explícitamente como capa Aplicación (Zod), no el PEA-SIS-005 genérico. */
export class TipoEntradaInvalidoError extends ErrorDominio {
  constructor() {
    super('PEA-VET-006', 'Elegí un tipo de entrada válido (vacuna, visita u observación).', 400);
  }
}

/**
 * Ya existe una fila en `autorizaciones_libreta` con `revocada_en IS NULL`
 * para ese par (mascotaId, veterinarioId) — el mismo caso que dispararía la
 * constraint `ux_autorizacion_activa` (docs/SCHEMA.md) si se dejara llegar
 * al INSERT. Código agregado en esta actividad (CRUD de autorizaciones
 * controlado por el dueño): docs/ERRORS.md Módulo 4 solo cubría la
 * perspectiva del veterinario (003-008) — ver docs/DECISIONES.md.
 */
export class AutorizacionLibretaYaActivaError extends ErrorDominio {
  constructor() {
    super('PEA-VET-009', 'Ya autorizaste a este veterinario para escribir en la libreta sanitaria de esta mascota.', 409);
  }
}

/** No hay ninguna autorización activa para revocar sobre ese par (mascotaId, veterinarioId) — nunca se autorizó, o ya estaba revocada. */
export class AutorizacionLibretaNoEncontradaError extends ErrorDominio {
  constructor() {
    super('PEA-VET-010', 'No encontramos esa autorización o ya no está activa.', 404);
  }
}

/** El `veterinarioId` indicado por el dueño no corresponde a ningún usuario con rol veterinario — mensaje genérico anti-enumeración, igual criterio que `MascotaSinAccesoLibretaError`. */
export class VeterinarioNoEncontradoError extends ErrorDominio {
  constructor() {
    super('PEA-VET-011', 'No encontramos ese veterinario o no está disponible para autorizar.', 404);
  }
}
