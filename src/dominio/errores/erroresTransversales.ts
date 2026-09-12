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
    super('PEA-SIS-004', 'El servicio no está disponible en este momento. Probá de nuevo en breve.', 503);
  }
}
