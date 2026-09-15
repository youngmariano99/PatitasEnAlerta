import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Código y mensaje copiados textualmente de docs/ERRORS.md — Módulo 7
 * (Marketplace de Comerciantes, Post-MVP). Ya estaba documentado desde el
 * modelado inicial, pero sin ninguna clase que lo implementara hasta la
 * actividad "Alta de comercio sujeta a verificación".
 */
export class ComercioTipoInvalidoError extends ErrorDominio {
  constructor() {
    super('PEA-COM-002', 'Elegí un tipo de comercio válido de la lista.', 400);
  }
}
