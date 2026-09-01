import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 2.
 * No modificar el mensaje acá sin actualizar primero el catálogo.
 */
export class CategoriaReporteObligatoriaError extends ErrorDominio {
  constructor() {
    super('PEA-REP-001', 'Elegí una categoría para tu reporte antes de continuar.', 400);
  }
}

export class FotoReporteObligatoriaError extends ErrorDominio {
  constructor() {
    super('PEA-REP-002', 'Necesitamos una foto para publicar el reporte.', 400);
  }
}

export class GeolocalizacionNoDisponibleError extends ErrorDominio {
  constructor() {
    super('PEA-REP-003', 'No pudimos obtener tu ubicación automáticamente. Marcala en el mapa.', 400);
  }
}

export class LimiteDeReportesExcedidoError extends ErrorDominio {
  /**
   * @param reintentarEnSegundos cuando se conoce (ConRateLimitDecorator.ts,
   * historia "Rate limiting anti-saturación"), tiempo hasta que el usuario
   * puede reintentar — el route handler lo traduce a la cabecera HTTP
   * `Retry-After` (Paso 3 del ticket). `undefined` cuando el rechazo viene
   * del eslabón ValidadorRateLimit del pipeline (que no expone ese dato) —
   * en ese caso la respuesta 429 no incluye la cabecera.
   */
  constructor(public readonly reintentarEnSegundos?: number) {
    super('PEA-REP-004', 'Hiciste varios reportes en poco tiempo. Esperá unos minutos antes de enviar otro.', 429);
  }
}

export class ReporteNoEncontradoError extends ErrorDominio {
  constructor() {
    super('PEA-REP-005', 'No encontramos ese reporte o ya no está disponible.', 404);
  }
}

export class CambioDeEstadoInvalidoError extends ErrorDominio {
  constructor() {
    super('PEA-REP-006', 'Ese cambio de estado no es válido en este momento.', 409);
  }
}

export class SoloMunicipioActualizaEstadoError extends ErrorDominio {
  constructor() {
    super('PEA-REP-007', 'Solo el municipio puede actualizar el estado de un reporte.', 403);
  }
}
