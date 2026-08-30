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
  constructor() {
    super('PEA-REP-004', 'Hiciste varios reportes en poco tiempo. Esperá unos minutos antes de enviar otro.', 429);
  }
}
