import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

export const HistorialEstadoColaboracionItemSchema = registroOpenApi.register(
  'HistorialEstadoColaboracionItem',
  z
    .object({
      id: z.string().uuid(),
      estadoAnterior: z.string(),
      estadoNuevo: z.string(),
      usuarioId: z.string().uuid(),
      registradoEn: z.string(),
    })
    .openapi('HistorialEstadoColaboracionItem'),
);

export const HistorialColaboracionRespuestaSchema = registroOpenApi.register(
  'HistorialColaboracionRespuesta',
  z.array(HistorialEstadoColaboracionItemSchema).openapi('HistorialColaboracionRespuesta'),
);

registroOpenApi.registerPath({
  method: 'get',
  path: '/red-colaboracion/colaboraciones/{id}/historial',
  tags: ['Red de Colaboración'],
  summary:
    'Historial de cambios de estado de una colaboración (hilo de coordinación), ordenado cronológicamente — organización dueña de la solicitud, el stakeholder que la propuso, o administrador.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Transiciones de estado de la colaboración, ordenadas por registrado_en ascendente.',
      content: { 'application/json': { schema: HistorialColaboracionRespuestaSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es parte de la colaboración ni administrador (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'La colaboración no existe o ya no está disponible (PEA-RED-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
