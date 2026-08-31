import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

export const HistorialEstadoItemSchema = registroOpenApi.register(
  'HistorialEstadoItem',
  z
    .object({
      id: z.string().uuid(),
      estadoAnterior: z.string(),
      estadoNuevo: z.string(),
      usuarioId: z.string().uuid(),
      registradoEn: z.string(),
    })
    .openapi('HistorialEstadoItem'),
);

export const HistorialReporteRespuestaSchema = registroOpenApi.register(
  'HistorialReporteRespuesta',
  z.array(HistorialEstadoItemSchema).openapi('HistorialReporteRespuesta'),
);

registroOpenApi.registerPath({
  method: 'get',
  path: '/reportes/{id}/historial',
  tags: ['Reportes'],
  summary:
    'Historial de cambios de estado de un reporte, ordenado cronológicamente — exclusivo del dueño del reporte, municipio o administrador.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Transiciones de estado del reporte, ordenadas por registrado_en ascendente.',
      content: { 'application/json': { schema: HistorialReporteRespuestaSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es el dueño del reporte ni tiene rol municipio/administrador (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: { description: 'El reporte no existe o ya no está disponible (PEA-REP-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
