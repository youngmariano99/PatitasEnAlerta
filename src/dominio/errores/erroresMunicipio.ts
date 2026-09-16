import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 3.
 * No modificar el mensaje acá sin actualizar primero el catálogo.
 */

/** Control optimista de concurrencia (ReservarTurnoCommand.ts): 0 filas afectadas por el UPDATE condicionado. */
export class TurnoYaReservadoError extends ErrorDominio {
  constructor() {
    super(
      'PEA-MUN-001',
      'Ese turno ya fue reservado por otra persona justo ahora. Elegí otro horario disponible.',
      409,
    );
  }
}

/** Reutilizable por cualquier caso de uso que resuelva un evento o turno por id (soft delete / no encontrado). */
export class EventoOTurnoNoEncontradoError extends ErrorDominio {
  constructor() {
    super('PEA-MUN-003', 'No encontramos ese evento o turno.', 404);
  }
}

export class FechaEventoPasadaError extends ErrorDominio {
  constructor() {
    super('PEA-MUN-004', 'La fecha del evento tiene que ser posterior a hoy.', 400);
  }
}

/**
 * Reutilizada por CrearEvento (eventos), por
 * PublicarFichaAdopcion/ActualizarFichaAdopcion/DarDeBajaFichaAdopcion
 * (vitrina de adopción) y por ObtenerDashboardMunicipal (dashboard
 * analítico) — el propio mensaje de docs/ERRORS.md ya cubre los tres
 * recursos, así que no hace falta un código separado por entidad.
 */
export class SoloMunicipioAdministraEventosError extends ErrorDominio {
  constructor() {
    super(
      'PEA-MUN-005',
      'Solo cuentas municipales pueden administrar eventos, la vitrina de adopción y el dashboard analítico.',
      403,
    );
  }
}

export class FichaAdopcionNoEncontradaError extends ErrorDominio {
  constructor() {
    super('PEA-MUN-008', 'No encontramos esa ficha de adopción o ya no está disponible.', 404);
  }
}

export class RangoFechasInvalidoExportacionError extends ErrorDominio {
  constructor() {
    super('PEA-MUN-007', 'El rango de fechas elegido no es válido para exportar el resumen.', 400);
  }
}

/**
 * Módulo 9 (extensión de atributos de compatibilidad, "Publicación de ficha
 * de adopción con atributos de compatibilidad"): a diferencia de
 * `SoloMunicipioAdministraEventosError` (PEA-MUN-005, todavía vigente para
 * `ActualizarFichaAdopcion`/`DarDeBajaFichaAdopcion`/eventos/dashboard,
 * exclusivos de municipio/administrador), la publicación de una ficha ahora
 * también admite rol `organizacion` — código propio porque el mensaje de
 * PEA-MUN-005 ("Solo cuentas municipales...") dejaría de ser preciso acá.
 */
export class SoloMunicipioUOrganizacionPublicaFichaError extends ErrorDominio {
  constructor() {
    super(
      'PEA-MUN-009',
      'Solo cuentas municipales o de organizaciones pueden publicar fichas de adopción.',
      403,
    );
  }
}
