import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

const TOPE_POR_PAGINA = 50;

export const ListarMisTurnosQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});

export type ParametrosListarMisTurnos = z.infer<typeof ListarMisTurnosQuerySchema>;

export const TurnoPropioSchema = registroOpenApi.register(
  'TurnoPropio',
  z
    .object({
      id: z.string().uuid(),
      proveedorTipo: z.string().openapi({ description: "'municipio' | 'veterinario'" }),
      proveedorId: z.string().uuid(),
      eventoId: z.string().uuid().nullable(),
      eventoTitulo: z.string().nullable().openapi({ description: "null para turnos de proveedor 'veterinario' (sin evento asociado)." }),
      franjaInicio: z.string().datetime().openapi({ description: 'ISO 8601' }),
      franjaFin: z.string().datetime().openapi({ description: 'ISO 8601' }),
      estado: z.string().openapi({ description: "'disponible' | 'reservado' | 'cancelado'" }),
    })
    .openapi('TurnoPropio'),
);

export const PaginaTurnosPropiosSchema = registroOpenApi.register(
  'PaginaTurnosPropios',
  z
    .object({
      items: z.array(TurnoPropioSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaTurnosPropios'),
);

export type PaginaTurnosPropiosDto = z.infer<typeof PaginaTurnosPropiosSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/turnos/mis-turnos',
  tags: ['Turnos'],
  summary:
    'Turnos propios del usuario autenticado, paginados (tope 50) — filtrado exclusivamente por reservado_por=usuario_actual(), nunca los de otro usuario.',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
    }),
  },
  responses: {
    200: { description: 'Página de turnos propios.', content: { 'application/json': { schema: PaginaTurnosPropiosSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
