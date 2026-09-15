import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Tasa de no-show del proveedor autenticado (Módulo 6, Paso 3 — "métrica
 * agregada sobre turnos.asistio, sin requerir una tabla adicional"). Se
 * calcula en el momento, nunca se persiste. Mismo criterio de "solo lectura,
 * sin comparación entre usuarios" que `MetricasPropiasSchema` (Módulo 5):
 * cada proveedor ve únicamente su propia tasa.
 */
export const TasaNoShowSchema = registroOpenApi.register(
  'TasaNoShow',
  z
    .object({
      totalConcluidos: z.number().int().nonnegative().openapi({ description: 'Turnos propios con asistio ya registrado (no null).' }),
      totalNoShow: z.number().int().nonnegative(),
      tasa: z.number().min(0).max(1).openapi({ description: 'totalNoShow / totalConcluidos — 0 si todavía no hay ningún turno concluido.' }),
    })
    .openapi('TasaNoShow'),
);

export type TasaNoShowDto = z.infer<typeof TasaNoShowSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/turnos/mi-tasa-no-show',
  tags: ['Turnos'],
  summary: 'Tasa de no-show agregada sobre los turnos propios del proveedor autenticado (municipio o veterinario).',
  responses: {
    200: {
      description: 'Tasa de no-show calculada en el momento.',
      content: { 'application/json': { schema: TasaNoShowSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
