/**
 * Puerto hacia el limitador de tasa (rate limiting) usado por el eslabón
 * ValidadorRateLimit del pipeline de ValidacionReporte.ts. Abstrae el
 * proveedor real (Upstash en infraestructura) para que el pipeline nunca
 * dependa de un SDK concreto — mismo criterio que IAlmacenamientoImagenes.
 */
export interface IControlDeTasa {
  /**
   * @param identificador clave sobre la que se cuentan los intentos (ej. el
   * id del usuario que reporta). Devuelve `true` si la acción está permitida
   * y `false` si el identificador superó su límite en la ventana vigente.
   */
  permitir(identificador: string): Promise<boolean>;
}
