export interface ResultadoControlDeTasa {
  permitido: boolean;
  /** Segundos hasta que el identificador puede reintentar — solo significativo cuando `permitido` es `false`. */
  reintentarEnSegundos: number;
}

/**
 * Variante de IControlDeTasa que además informa cuándo puede reintentarse
 * (cabecera HTTP `Retry-After`) — a diferencia de `IControlDeTasa.permitir`
 * (usado por ValidadorRateLimit del pipeline de ValidacionReporte.ts, que
 * solo necesita un booleano), ConRateLimitDecorator.ts sí necesita ese dato
 * para poder devolverlo en la respuesta 429 (PEA-REP-004, docs/ERRORS.md).
 * Puerto separado en vez de ampliar IControlDeTasa: mantiene ese contrato
 * existente sin forzar a su único consumidor actual a lidiar con un campo
 * que nunca usa (Interface Segregation).
 */
export interface IControlDeTasaConReintento {
  evaluar(identificador: string): Promise<ResultadoControlDeTasa>;
}
