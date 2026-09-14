import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Métricas personales de contribución (Historia de rescatista/veterinario,
 * docs/REQUISITOS.md Módulo 5 — Post-MVP: "Consultar sus propias métricas de
 * contribución, sin exposición pública comparativa frente a otros
 * usuarios"). Deliberadamente SIN ningún campo de ranking, promedio general
 * ni posición relativa a otros usuarios — solo el agregado de las propias
 * colaboraciones completadas.
 */
export const MetricasPropiasSchema = registroOpenApi.register(
  'MetricasPropias',
  z
    .object({
      totalCompletadas: z.number().int().nonnegative(),
      porTipo: z
        .record(z.string(), z.number().int().nonnegative())
        .openapi({ description: "Desglose por tipo de solicitud (docs/SCHEMA.md), ej. { transito: 3, insumos: 1 }." }),
    })
    .openapi('MetricasPropias'),
);

export type MetricasPropiasDto = z.infer<typeof MetricasPropiasSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/red-colaboracion/metricas',
  tags: ['Red de Colaboración'],
  summary:
    'Métricas propias de contribución (colaboraciones completadas), agregadas exclusivamente por stakeholder_id=usuario_actual() — sin rankings ni comparación con otros usuarios.',
  responses: {
    200: {
      description: 'Métricas agregadas de las propias colaboraciones completadas.',
      content: { 'application/json': { schema: MetricasPropiasSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
