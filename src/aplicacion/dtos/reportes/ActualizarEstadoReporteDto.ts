import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { ESTADOS_REPORTE_SOPORTADOS } from '@dominio/entidades/Reporte';

export const ActualizarEstadoReporteBodySchema = registroOpenApi.register(
  'ActualizarEstadoReporteBody',
  z
    .object({
      estado: z.enum(ESTADOS_REPORTE_SOPORTADOS, {
        required_error: 'Elegí un estado válido para el reporte.',
        invalid_type_error: 'Elegí un estado válido para el reporte.',
      }),
    })
    .openapi('ActualizarEstadoReporteBody'),
);

export type ActualizarEstadoReporteBody = z.infer<typeof ActualizarEstadoReporteBodySchema>;

export const ReporteEstadoActualizadoSchema = registroOpenApi.register(
  'ReporteEstadoActualizado',
  z
    .object({
      id: z.string().uuid(),
      estado: z.string(),
      estadoAnterior: z.string(),
    })
    .openapi('ReporteEstadoActualizado'),
);

registroOpenApi.registerPath({
  method: 'patch',
  path: '/reportes/{id}/estado',
  tags: ['Reportes'],
  summary: 'Cambia el estado de un reporte — exclusivo de rol municipio o administrador (Panel municipal).',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: ActualizarEstadoReporteBodySchema } } },
  },
  responses: {
    200: {
      description: 'Estado actualizado, con historial registrado en reportes_historial_estado.',
      content: { 'application/json': { schema: ReporteEstadoActualizadoSchema } },
    },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol municipio/administrador (PEA-REP-007).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: { description: 'El reporte no existe o ya no está disponible (PEA-REP-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    409: {
      description: 'La transición de estado pedida no es válida desde el estado actual (PEA-REP-006).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
