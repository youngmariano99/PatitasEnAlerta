import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 8
 * (Foros y Cursos de Bienestar Animal, Post-MVP). PEA-FORO-002/003/004 se
 * activan en la actividad "Caso de uso CrearTemaForo con moderación de
 * Administrador".
 */
export class TemaForoNoEncontradoError extends ErrorDominio {
  constructor() {
    super('PEA-FORO-002', 'No encontramos ese curso o esa publicación.', 404);
  }
}

/** `titulo`/`contenido` vacíos tras `trim()` — docs/ERRORS.md marca PEA-FORO-003 explícitamente como capa "Aplicación (Zod)", no el PEA-SIS-005 genérico. */
export class ContenidoTemaRequeridoError extends ErrorDominio {
  constructor() {
    super('PEA-FORO-003', 'Escribí un contenido antes de publicar tu tema o respuesta.', 400);
  }
}

/** El autor intenta editar un tema que un Administrador ya moderó (soft delete por contenido inapropiado, AC explícito del ticket). */
export class TemaForoModeradoError extends ErrorDominio {
  constructor() {
    super('PEA-FORO-004', 'Este contenido fue moderado y ya no puede editarse.', 403);
  }
}
