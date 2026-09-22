import { trace, SpanStatusCode } from '@opentelemetry/api';

const NOMBRE_TRACER = 'patitas-en-alerta';

/**
 * Envuelve un bloque de escritura de uno de los 3 flujos críticos exigidos
 * por CLAUDE.md/REQUISITOS.md (creación de reporte, reserva de turno,
 * escritura en libreta sanitaria) en un span de OpenTelemetry. Nunca cambia
 * el resultado ni el comportamiento de `fn`: si `fn` lanza, el span registra
 * la excepción y se re-lanza el mismo error sin envolverlo — la traza es
 * puramente observacional, jamás una fuente de errores nuevos.
 *
 * Sin `OTEL_EXPORTER_OTLP_ENDPOINT` configurado (`instrumentation.ts`), el
 * SDK nunca se registra y `trace.getTracer(...)` devuelve un tracer no-op:
 * este helper es seguro de llamar siempre, incluso sin colector.
 */
export async function conTraza<T>(
  nombreSpan: string,
  atributos: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(NOMBRE_TRACER);
  return tracer.startActiveSpan(nombreSpan, async (span) => {
    try {
      for (const [clave, valor] of Object.entries(atributos)) {
        span.setAttribute(clave, valor);
      }
      const resultado = await fn();
      span.end();
      return resultado;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      throw error;
    }
  });
}
