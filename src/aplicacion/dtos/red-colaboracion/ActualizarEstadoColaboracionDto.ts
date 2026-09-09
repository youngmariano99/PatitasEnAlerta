import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { ESTADOS_COLABORACION_SOPORTADOS } from '@dominio/entidades/Colaboracion';

export const ActualizarEstadoColaboracionBodySchema = registroOpenApi.register(
  'ActualizarEstadoColaboracionBody',
  z
    .object({
      estado: z.enum(ESTADOS_COLABORACION_SOPORTADOS, {
        required_error: 'Elegí un estado válido para la colaboración.',
        invalid_type_error: 'Elegí un estado válido para la colaboración.',
      }),
    })
    .openapi('ActualizarEstadoColaboracionBody'),
);

export type ActualizarEstadoColaboracionBody = z.infer<typeof ActualizarEstadoColaboracionBodySchema>;

export const ColaboracionEstadoActualizadoSchema = registroOpenApi.register(
  'ColaboracionEstadoActualizado',
  z
    .object({
      id: z.string().uuid(),
      estado: z.string(),
      estadoAnterior: z.string(),
    })
    .openapi('ColaboracionEstadoActualizado'),
);

registroOpenApi.registerPath({
  method: 'patch',
  path: '/red-colaboracion/colaboraciones/{id}/estado',
  tags: ['Red de Colaboración'],
  summary:
    'Cambia el estado de una colaboración (aceptar/rechazar/completar) — exclusivo de la organización dueña de la solicitud asociada.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: ActualizarEstadoColaboracionBodySchema } } },
  },
  responses: {
    200: {
      description: 'Estado actualizado, con historial registrado en colaboraciones_historial_estado.',
      content: { 'application/json': { schema: ColaboracionEstadoActualizadoSchema } },
    },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es la organización dueña de la solicitud asociada (PEA-RED-004).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'La colaboración no existe o ya no está disponible (PEA-RED-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description: 'La transición de estado pedida no es válida desde el estado actual (PEA-RED-006).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
