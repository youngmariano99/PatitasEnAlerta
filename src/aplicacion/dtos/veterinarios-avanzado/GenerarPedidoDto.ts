import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada de "Generar pedido" (Módulo 6, Paso 2). `productoId`
 * viene de la ruta, `compradorId` siempre se deriva de la sesión autenticada
 * — ninguno de los dos forma parte de este esquema, mismo criterio que
 * `ActualizarAsistioTurnoDto`.
 */
export const GenerarPedidoSchema = registroOpenApi.register(
  'GenerarPedidoDto',
  z
    .object({
      cantidad: z
        .number({ required_error: 'Indicá la cantidad que querés pedir.' })
        .int('La cantidad tiene que ser un número entero.')
        .positive('La cantidad tiene que ser mayor a cero.'),
    })
    .openapi('GenerarPedidoDto'),
);
export type DatosGenerarPedidoDto = z.infer<typeof GenerarPedidoSchema>;

export interface ComandoGenerarPedido extends DatosGenerarPedidoDto {
  productoId: string;
  compradorId: string;
}

export const PedidoGeneradoSchema = registroOpenApi.register(
  'PedidoGenerado',
  z
    .object({
      id: z.string().uuid(),
      productoId: z.string().uuid(),
      compradorId: z.string().uuid(),
      cantidad: z.number().int(),
      precioUnitario: z.number(),
      estado: z.string().openapi({ example: 'pendiente' }),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('PedidoGenerado'),
);
export type PedidoGeneradoDto = z.infer<typeof PedidoGeneradoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/veterinarios/productos/{id}/pedidos',
  tags: ['Veterinarios Avanzado'],
  summary: 'Genera un pedido sobre un producto del catálogo — exclusivo de rol dueño.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: GenerarPedidoSchema } } },
  },
  responses: {
    201: { description: 'Pedido generado, con estado inicial "pendiente".', content: { 'application/json': { schema: PedidoGeneradoSchema } } },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol dueño (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'El producto no existe o ya no está disponible (PEA-VETADV-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description: 'No queda stock suficiente para la cantidad pedida (PEA-VETADV-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
