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
