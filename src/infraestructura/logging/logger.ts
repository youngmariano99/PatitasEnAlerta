import pino from 'pino';

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

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: { paths: redactedPaths, censor: '[REDACTADO]' },
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
});
