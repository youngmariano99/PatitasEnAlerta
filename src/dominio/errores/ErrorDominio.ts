/**
 * Excepción base para todo error de negocio con código estandarizado según
 * docs/ERRORS.md (`PEA-[MÓDULO]-[NNN]`). Prohibido lanzar errores de negocio
 * sin un código presente en ese catálogo (ver CLAUDE.md, Errores de negocio).
 */
export class ErrorDominio extends Error {
  constructor(
    public readonly codigo: string,
    message: string,
    public readonly statusHttp: number,
  ) {
    super(message);
    this.name = 'ErrorDominio';
  }
}
