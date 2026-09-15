import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 7
 * (Marketplace de Comerciantes, Post-MVP). PEA-COM-001/002/003 ya estaban
 * documentados desde el modelado inicial. PEA-COM-002 se activó en la
 * actividad "Alta de comercio sujeta a verificación"; PEA-COM-001 y
 * PEA-COM-004 (este último, nuevo en el catálogo) se activan en "CRUD de
 * productos_comercio restringido al comercio propio" (docs/DECISIONES.md).
 */
export class ComercioTipoInvalidoError extends ErrorDominio {
  constructor() {
    super('PEA-COM-002', 'Elegí un tipo de comercio válido de la lista.', 400);
  }
}

/** El comerciante intenta publicar/editar un producto mientras su comercio sigue con `estado_verificacion <> 'verificado'` (AC explícito del ticket). */
export class ComercioNoVerificadoError extends ErrorDominio {
  constructor() {
    super('PEA-COM-001', 'Tu comercio todavía está en revisión. Podrás publicar productos una vez verificado.', 403);
  }
}

/** El usuario autenticado (con o sin rol comerciante) no tiene ningún comercio propio registrado — reutilizado también cuando se resuelve el comercio propio para autorizar sobre `productos_comercio`. */
export class ComercioPropioNoEncontradoError extends ErrorDominio {
  constructor() {
    super('PEA-COM-003', 'No encontramos ese comercio o ya no está disponible.', 404);
  }
}

/** No hay un producto activo con ese id — colapsa "no existe" y "soft-deleted", mismo criterio anti-enumeración que `ProductoNoDisponibleError` (Módulo 6). */
export class ProductoComercioNoEncontradoError extends ErrorDominio {
  constructor() {
    super('PEA-COM-004', 'No encontramos ese producto o ya no está disponible.', 404);
  }
}
