import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { TIPOS_EVENTO_SOPORTADOS } from '@aplicacion/dtos/municipio/CrearEventoDto';

const TOPE_POR_PAGINA = 50;

/**
 * Query params de GET /municipio/eventos (calendario público, sin login —
 * ver app/api/municipio/eventos/route.ts). A diferencia de
 * ListarReportesDto, acá `fechaDesde`/`fechaHasta` filtran sobre
 * `eventos.fecha` (el operativo en sí, no `created_at`): es lo que un
 * calendario necesita — "qué operativos hay entre estas dos fechas" — para
 * poder pedir un mes a la vez sin traer todo el histórico.
 *
 * `tipo` fuera de catálogo (`.catch(undefined)`) se ignora en vez de
 * rechazar la request, mismo criterio que ListarReportesDto: un filtro de
 * listado inválido no amerita un 400 duro.
 */
export const ListarEventosPublicoQuerySchema = z
  .object({
    pagina: z.coerce.number().int().min(1).catch(1),
    porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
    tipo: z.enum(TIPOS_EVENTO_SOPORTADOS).optional().catch(undefined),
    fechaDesde: z.coerce.date({ invalid_type_error: 'La fecha "desde" no es válida.' }).optional(),
    fechaHasta: z.coerce.date({ invalid_type_error: 'La fecha "hasta" no es válida.' }).optional(),
  })
  .superRefine((datos, ctx) => {
    if (datos.fechaDesde && datos.fechaHasta && datos.fechaDesde > datos.fechaHasta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fechaDesde'],
        message: 'La fecha "desde" tiene que ser anterior a la fecha "hasta".',
      });
    }
  });

export type ParametrosListarEventosPublico = z.infer<typeof ListarEventosPublicoQuerySchema>;

export const EventoListadoSchema = registroOpenApi.register(
  'EventoListado',
  z
    .object({
      id: z.string().uuid(),
      municipioId: z.string().uuid(),
      titulo: z.string(),
      tipo: z.string(),
      direccion: z.string(),
      latitud: z.number(),
      longitud: z.number(),
      fecha: z.string().datetime().openapi({ description: 'ISO 8601' }),
      cuposTotales: z.number().int(),
      requisitos: z.string().nullable(),
    })
    .openapi('EventoListado'),
);

export const PaginaEventosSchema = registroOpenApi.register(
  'PaginaEventos',
  z
    .object({
      items: z.array(EventoListadoSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaEventos'),
);

export type PaginaEventosDto = z.infer<typeof PaginaEventosSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/municipio/eventos',
  tags: ['Municipio'],
  summary:
    'Calendario público y paginado (tope 50) de operativos municipales activos, con filtro opcional por tipo y rango de fechas. Sin autenticación (GRANT SELECT a anon).',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
      tipo: z.enum(TIPOS_EVENTO_SOPORTADOS).optional(),
      fechaDesde: z.coerce.date().optional().openapi({ description: 'Filtra por fecha >= fechaDesde (ISO 8601).' }),
      fechaHasta: z.coerce.date().optional().openapi({ description: 'Filtra por fecha <= fechaHasta (ISO 8601).' }),
    }),
  },
  responses: {
    200: {
      description: 'Página de operativos activos que cumplen los filtros aplicados, ordenados por fecha ascendente.',
      content: { 'application/json': { schema: PaginaEventosSchema } },
    },
    400: {
      description: 'Rango de fechas inválido (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
