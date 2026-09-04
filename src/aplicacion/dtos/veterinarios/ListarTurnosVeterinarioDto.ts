import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

const TOPE_POR_PAGINA = 50;

export const ListarTurnosVeterinarioQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});

export type ParametrosListarTurnosVeterinario = z.infer<typeof ListarTurnosVeterinarioQuerySchema>;

export const TurnoReservadoVeterinarioSchema = registroOpenApi.register(
  'TurnoReservadoVeterinario',
  z
    .object({
      id: z.string().uuid(),
      franjaInicio: z.string().datetime().openapi({ description: 'ISO 8601' }),
      franjaFin: z.string().datetime().openapi({ description: 'ISO 8601' }),
      reservadoPorEmail: z.string().email(),
    })
    .openapi('TurnoReservadoVeterinario'),
);

export const PaginaTurnosReservadosVeterinarioSchema = registroOpenApi.register(
  'PaginaTurnosReservadosVeterinario',
  z
    .object({
      items: z.array(TurnoReservadoVeterinarioSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaTurnosReservadosVeterinario'),
);

export type PaginaTurnosReservadosVeterinarioDto = z.infer<typeof PaginaTurnosReservadosVeterinarioSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/veterinarios/turnos',
  tags: ['Veterinarios'],
  summary:
    "Agenda propia del veterinario autenticado: turnos en estado 'reservado', paginados (tope 50) — filtrado exclusivamente por proveedor_id=usuario_actual().",
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Página de turnos reservados de la agenda propia.',
      content: { 'application/json': { schema: PaginaTurnosReservadosVeterinarioSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
