import pino from 'pino';
import pretty from 'pino-pretty';

/**
 * Singleton de logging estructurado (NFR Trazabilidad).
 * Nunca loggear password_hash, tokens ni datos sanitarios en texto plano:
 * se redactan automáticamente acá para que ningún caso de uso pueda filtrarlos por error.
 */
const redactedPaths = [
  'password',
  'passwordHash',
  '*.password',
  '*.passwordHash',
  'req.headers.authorization',
  'SUPABASE_SERVICE_ROLE_KEY',
];

// `transport: { target: 'pino-pretty' }` (la forma documentada de pino) spawnea
// un worker thread vía `thread-stream` — bajo `next dev` ese worker no
// resuelve sus propios módulos internos a través del bundler de webpack
// (`Cannot find module '.next/server/vendor-chunks/lib/worker.js'`), y el
// worker roto tira abajo cualquier `logger.error()` posterior (incluido el de
// los propios route handlers), enmascarando el error real detrás de un
// "the worker has exited". Se evita instanciando `pino-pretty` como stream
// sincrónico de destino en vez de como transport — mismo resultado visual,
// sin worker thread de por medio.
export const logger = pino(
  {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: { paths: redactedPaths, censor: '[REDACTADO]' },
  },
  process.env.NODE_ENV === 'production' ? undefined : pretty({ colorize: true }),
);
