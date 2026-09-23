import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — sección
 * "Transversal". Reutilizables por cualquier módulo/endpoint protegido.
 */
export class NoAutenticadoError extends ErrorDominio {
  constructor() {
    super('PEA-SIS-001', 'Necesitás iniciar sesión para hacer esto.', 401);
  }
}

export class AccesoNoAutorizadoError extends ErrorDominio {
  constructor() {
    super('PEA-SIS-002', 'No tenés permiso para realizar esta acción.', 403);
  }
}

/** Dependencia externa caída o con error (ej. proveedor de embeddings) — ver OpenAIGeneradorEmbeddings.ts. */
export class ServicioExternoNoDisponibleError extends ErrorDominio {
  constructor() {
    super(
      'PEA-SIS-004',
      'El servicio no está disponible en este momento. Probá de nuevo en breve.',
      503,
    );
  }
}

/**
 * Rate limit genérico y transversal (a diferencia de `LimiteDeReportesExcedidoError`,
 * específico de reportes) — pensado para reutilizarse en cualquier endpoint
 * protegido que necesite un 429 sin un código de módulo propio (ver
 * UpstashControlDeTasaGeocoding.ts, el primer consumidor).
 */
export class LimiteDeConsultasExcedidoError extends ErrorDominio {
  constructor(public readonly reintentarEnSegundos?: number) {
    super(
      'PEA-SIS-006',
      'Hiciste muchas solicitudes seguidas. Esperá un momento antes de volver a intentar.',
      429,
    );
  }
}
