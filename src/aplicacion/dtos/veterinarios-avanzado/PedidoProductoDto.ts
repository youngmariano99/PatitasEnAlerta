import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

const TOPE_POR_PAGINA = 50;

export const PedidoProductoSchema = registroOpenApi.register(
  'PedidoProducto',
  z
    .object({
      id: z.string().uuid(),
      productoId: z.string().uuid(),
      compradorId: z.string().uuid(),
      cantidad: z.number().int(),
      precioUnitario: z.number(),
      estado: z.string(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('PedidoProducto'),
);
export type PedidoProductoDto = z.infer<typeof PedidoProductoSchema>;

export const PaginaPedidosSchema = registroOpenApi.register(
  'PaginaPedidosProducto',
  z
    .object({
      items: z.array(PedidoProductoSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaPedidosProducto'),
);
export type PaginaPedidosDto = z.infer<typeof PaginaPedidosSchema>;

const QUERY_PAGINACION = z.object({
  pagina: z.coerce.number().int().min(1).optional(),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
});

export const ActualizarEstadoPedidoSchema = z.object({
  estado: z.enum(['confirmado', 'cancelado'], {
    required_error: 'Indicá a qué estado querés pasar el pedido.',
  }),
});
export type DatosActualizarEstadoPedido = z.infer<typeof ActualizarEstadoPedidoSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/veterinarios/productos/mis-pedidos',
  tags: ['Veterinarios Avanzado'],
  summary: 'Pedidos propios del dueño autenticado, paginado (tope 50).',
  request: { query: QUERY_PAGINACION },
  responses: {
    200: {
      description: 'Página de pedidos propios.',
      content: { 'application/json': { schema: PaginaPedidosSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    403: {
      description: 'Quien invoca no tiene rol dueño (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});

registroOpenApi.registerPath({
  method: 'get',
  path: '/veterinarios/pedidos-recibidos',
  tags: ['Veterinarios Avanzado'],
  summary:
    'Pedidos recibidos sobre productos propios del veterinario autenticado, paginado (tope 50).',
  request: { query: QUERY_PAGINACION },
  responses: {
    200: {
      description: 'Página de pedidos recibidos.',
      content: { 'application/json': { schema: PaginaPedidosSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    403: {
      description: 'Quien invoca no tiene rol veterinario (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});

registroOpenApi.registerPath({
  method: 'patch',
  path: '/veterinarios/pedidos-recibidos/{id}',
  tags: ['Veterinarios Avanzado'],
  summary:
    'Confirma o cancela un pedido recibido — exclusivo del veterinario dueño del producto pedido.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: ActualizarEstadoPedidoSchema } } },
  },
  responses: {
    200: {
      description: 'Pedido actualizado.',
      content: { 'application/json': { schema: PedidoProductoSchema } },
    },
    400: {
      description: 'Payload inválido (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    403: {
      description: 'Quien invoca no tiene rol veterinario (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description: 'El pedido no existe, no es propio, o ya no está pendiente (PEA-VETADV-004).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
