import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

export const TurnoDisponibleDtoSchema = registroOpenApi.register(
  'TurnoDisponibleDto',
  z
    .object({
      id: z.string().uuid(),
      franjaInicio: z.string().datetime(),
      franjaFin: z.string().datetime(),
      estado: z.string(),
    })
    .openapi('TurnoDisponibleDto'),
);

export type TurnoDisponibleDto = z.infer<typeof TurnoDisponibleDtoSchema>;

export const ListarTurnosPorEventoQuerySchema = z.object({
  eventoId: z.string().uuid('El identificador del evento no es válido.'),
});
const QuerySchema = ListarTurnosPorEventoQuerySchema;

registroOpenApi.registerPath({
  method: 'get',
  path: '/turnos/por-evento',
  tags: ['Turnos'],
  summary:
    'Todos los turnos generados para un evento (cualquier estado), orden por franja_inicio — usada por la turnera municipal y por la reserva de turno del vecino.',
  request: { query: QuerySchema },
  responses: {
    200: {
      description: 'Turnos del evento indicado.',
      content: { 'application/json': { schema: z.array(TurnoDisponibleDtoSchema) } },
    },
    400: {
      description: 'eventoId inválido o ausente (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
