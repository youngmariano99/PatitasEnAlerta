import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada compartido por alta y edición de un producto propio
 * (Módulo 6, Historia "Venta de productos veterinarios", Paso 1: CRUD
 * restringido al `veterinario_id` propio). `veterinarioId` NO forma parte
 * de este esquema: siempre se deriva de la sesión autenticada en el route
 * handler, nunca del body del cliente — mismo criterio que `organizacionId`
 * en `PublicarSolicitudRecursoDto`.
 */
export const DatosProductoSchema = z.object({
  nombre: z
    .string({ required_error: 'Ingresá el nombre del producto.' })
    .trim()
    .min(1, 'Ingresá el nombre del producto.')
    .max(150, 'El nombre no puede superar los 150 caracteres.'),
  descripcion: z
    .string()
    .trim()
    .max(1000, 'La descripción no puede superar los 1000 caracteres.')
    .nullable()
    .optional()
    .transform((valor) => valor ?? null),
  precio: z
    .number({ required_error: 'Ingresá el precio del producto.' })
    .nonnegative('El precio no puede ser negativo.'),
  stock: z
    .number({ required_error: 'Ingresá el stock disponible.' })
    .int('El stock tiene que ser un número entero.')
    .nonnegative('El stock no puede ser negativo.'),
});

export const CrearProductoSchema = registroOpenApi.register('CrearProductoDto', DatosProductoSchema.openapi('CrearProductoDto'));
export type DatosCrearProductoDto = z.infer<typeof CrearProductoSchema>;
export interface ComandoCrearProducto extends DatosCrearProductoDto {
  veterinarioId: string;
}

export const ActualizarProductoSchema = registroOpenApi.register(
  'ActualizarProductoDto',
  DatosProductoSchema.openapi('ActualizarProductoDto'),
);
export type DatosActualizarProductoDto = z.infer<typeof ActualizarProductoSchema>;
export interface ComandoActualizarProducto extends DatosActualizarProductoDto {
  productoId: string;
  veterinarioId: string;
}

export const ProductoVeterinarioSchema = registroOpenApi.register(
  'ProductoVeterinario',
  z
    .object({
      id: z.string().uuid(),
      veterinarioId: z.string().uuid(),
      nombre: z.string(),
      descripcion: z.string().nullable(),
      precio: z.number(),
      stock: z.number().int(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('ProductoVeterinario'),
);
export type ProductoVeterinarioDto = z.infer<typeof ProductoVeterinarioSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/veterinarios/productos',
  tags: ['Veterinarios Avanzado'],
  summary: 'Publica un nuevo producto del catálogo propio del veterinario autenticado.',
  request: { body: { content: { 'application/json': { schema: CrearProductoSchema } } } },
  responses: {
    201: { description: 'Producto creado.', content: { 'application/json': { schema: ProductoVeterinarioSchema } } },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol veterinario (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});

registroOpenApi.registerPath({
  method: 'patch',
  path: '/veterinarios/productos/{id}',
  tags: ['Veterinarios Avanzado'],
  summary: 'Edita un producto propio — exclusivo del veterinario dueño del producto.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: ActualizarProductoSchema } } },
  },
  responses: {
    200: { description: 'Producto actualizado.', content: { 'application/json': { schema: ProductoVeterinarioSchema } } },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es el veterinario dueño del producto (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'El producto no existe o ya no está disponible (PEA-VETADV-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});

registroOpenApi.registerPath({
  method: 'delete',
  path: '/veterinarios/productos/{id}',
  tags: ['Veterinarios Avanzado'],
  summary: 'Da de baja (soft delete) un producto propio — exclusivo del veterinario dueño del producto.',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: 'Producto dado de baja.', content: { 'application/json': { schema: z.object({ id: z.string().uuid() }) } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es el veterinario dueño del producto (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'El producto no existe o ya no está disponible (PEA-VETADV-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
