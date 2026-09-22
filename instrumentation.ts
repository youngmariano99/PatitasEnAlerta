/**
 * Hook de arranque de Next.js (`experimental.instrumentationHook`,
 * next.config.js) — corre una única vez por proceso, antes de servir la
 * primera request. Registra el SDK de OpenTelemetry únicamente cuando hay
 * un colector configurado (`OTEL_EXPORTER_OTLP_ENDPOINT`, docs/SETUP.md
 * Paso 8): sin esa variable, el SDK nunca se instancia y
 * `conTraza()` (src/infraestructura/observabilidad/trazas.ts) opera sobre
 * un tracer no-op, sin overhead ni intentos de conexión fallidos.
 *
 * Deliberadamente NO usa `@opentelemetry/sdk-node` (`NodeSDK`) ni
 * `getNodeAutoInstrumentations()`: ambos arrastran, de forma transitiva e
 * incondicional, módulos que envuelven APIs nativas de Node (`fs`, `net`,
 * `tls`, `zlib`, `@grpc/grpc-js`) que el bundler de Next.js no logra
 * resolver al compilar `instrumentation.ts` — rompe `npm run build` aunque
 * ninguno de esos transportes/instrumentaciones se use en tiempo de
 * ejecución. Se arma a mano únicamente lo necesario para exportar los spans
 * manuales de `conTraza()` (los 3 flujos críticos exigidos): un
 * `NodeTracerProvider` con el exportador HTTP explícito, sin auto-
 * instrumentación de librerías de terceros.
 *
 * Excluido de Edge Runtime (middleware.ts corre en Edge, donde el SDK de
 * Node de OpenTelemetry no es compatible) — solo se registra en el runtime
 * `nodejs`, que es donde corren los route handlers y los 3 flujos críticos
 * instrumentados.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-node');
  const { BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-base');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
  const { Resource } = await import('@opentelemetry/resources');
  const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME || 'patitas-en-alerta',
    }),
  });
  provider.addSpanProcessor(
    new BatchSpanProcessor(new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })),
  );
  provider.register();
}
