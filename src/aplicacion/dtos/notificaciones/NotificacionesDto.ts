import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

const TOPE_POR_PAGINA = 50;

export const ListarNotificacionesQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});

export type ParametrosListarNotificaciones = z.infer<typeof ListarNotificacionesQuerySchema>;

export const NotificacionListadaSchema = registroOpenApi.register(
  'NotificacionListada',
  z
    .object({
      id: z.string().uuid(),
      tipo: z.string().openapi({
        description: "CHECK: 'reporte_coincidente' | 'turno_confirmado' | 'turno_cancelado' | 'verificacion_resuelta'",
      }),
      referenciaTabla: z.string(),
      referenciaId: z.string().uuid(),
      leido: z.boolean(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('NotificacionListada'),
);

export const PaginaNotificacionesSchema = registroOpenApi.register(
  'PaginaNotificaciones',
  z
    .object({
      items: z.array(NotificacionListadaSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
      noLeidas: z.number().int().openapi({ description: 'No leídas en TODA la bandeja, no solo esta página — para el badge.' }),
    })
    .openapi('PaginaNotificaciones'),
);

export type PaginaNotificacionesDto = z.infer<typeof PaginaNotificacionesSchema>;

export const NotificacionMarcadaLeidaSchema = registroOpenApi.register(
  'NotificacionMarcadaLeida',
  z.object({ id: z.string().uuid(), leido: z.literal(true) }).openapi('NotificacionMarcadaLeida'),
);

export type NotificacionMarcadaLeida = z.infer<typeof NotificacionMarcadaLeidaSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/notificaciones',
  tags: ['Notificaciones'],
  summary: 'Bandeja propia de notificaciones, paginada (tope 50) — solo lo del usuario autenticado.',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
    }),
  },
  responses: {
    200: { description: 'Página de notificaciones propias.', content: { 'application/json': { schema: PaginaNotificacionesSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'patch',
  path: '/notificaciones/{id}',
  tags: ['Notificaciones'],
  summary: 'Marca una notificación propia como leída.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: { description: 'Notificación marcada como leída.', content: { 'application/json': { schema: NotificacionMarcadaLeidaSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'La notificación no existe o no es del usuario autenticado (PEA-SIS-002, anti-enumeración).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
