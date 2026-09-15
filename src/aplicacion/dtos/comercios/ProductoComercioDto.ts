import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada compartido por alta y edición de un producto propio
 * (Módulo 7, Historia "Publicación de catálogo de productos", Paso 1: CRUD
 * restringido al `comercio_id` propio). `comercioId` NO forma parte de este
 * esquema: siempre se resuelve del comercio del usuario autenticado en el
 * caso de uso, nunca del body del cliente — mismo criterio que
 * `veterinarioId` en `ProductoVeterinarioDto.ts`. `descripcion` pasa por
 * DOMPurify (Paso 3) antes de persistir, no acá — este esquema solo valida
 * forma y tipos.
 */
export const DatosProductoComercioSchema = z.object({
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
  categoria: z
    .string()
    .trim()
    .max(100, 'La categoría no puede superar los 100 caracteres.')
    .nullable()
    .optional()
    .transform((valor) => valor ?? null),
  precio: z
    .number()
    .nonnegative('El precio no puede ser negativo.')
    .nullable()
    .optional()
    .transform((valor) => valor ?? null),
});

export const PublicarProductoComercioSchema = registroOpenApi.register(
  'PublicarProductoComercioDto',
  DatosProductoComercioSchema.openapi('PublicarProductoComercioDto'),
);
export type DatosPublicarProductoComercioDto = z.infer<typeof PublicarProductoComercioSchema>;
export interface ComandoPublicarProductoComercio extends DatosPublicarProductoComercioDto {
  usuarioId: string;
}

export const ActualizarProductoComercioSchema = registroOpenApi.register(
  'ActualizarProductoComercioDto',
  DatosProductoComercioSchema.openapi('ActualizarProductoComercioDto'),
);
export type DatosActualizarProductoComercioDto = z.infer<typeof ActualizarProductoComercioSchema>;
export interface ComandoActualizarProductoComercio extends DatosActualizarProductoComercioDto {
  productoId: string;
  usuarioId: string;
}

export const ProductoComercioDtoSchema = registroOpenApi.register(
  'ProductoComercioDto',
  z
    .object({
      id: z.string().uuid(),
      comercioId: z.string().uuid(),
      nombre: z.string(),
      descripcion: z.string().nullable(),
      categoria: z.string().nullable(),
      precio: z.number().nullable(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('ProductoComercioDto'),
);
export type ProductoComercioDto = z.infer<typeof ProductoComercioDtoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/comercios/productos',
  tags: ['Comercios'],
  summary: 'Publica un producto del catálogo propio del comercio autenticado — exige comercio verificado (Módulo 7, Paso 2).',
  request: { body: { content: { 'application/json': { schema: PublicarProductoComercioSchema } } } },
  responses: {
    201: { description: 'Producto publicado.', content: { 'application/json': { schema: ProductoComercioDtoSchema } } },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol comerciante (PEA-SIS-002), o su comercio todavía no está verificado (PEA-COM-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'Quien invoca no tiene ningún comercio registrado (PEA-COM-003).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});

const ParametrosProductoSchema = z.object({ id: z.string().uuid() });

registroOpenApi.registerPath({
  method: 'patch',
  path: '/comercios/productos/{id}',
  tags: ['Comercios'],
  summary: 'Edita un producto propio — exclusivo del comercio dueño del producto.',
  request: {
    params: ParametrosProductoSchema,
    body: { content: { 'application/json': { schema: ActualizarProductoComercioSchema } } },
  },
  responses: {
    200: { description: 'Producto actualizado.', content: { 'application/json': { schema: ProductoComercioDtoSchema } } },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es dueño del comercio al que pertenece el producto (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'El producto no existe o ya no está disponible (PEA-COM-004).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});

registroOpenApi.registerPath({
  method: 'delete',
  path: '/comercios/productos/{id}',
  tags: ['Comercios'],
  summary: 'Da de baja (soft delete) un producto propio — exclusivo del comercio dueño del producto.',
  request: { params: ParametrosProductoSchema },
  responses: {
    200: { description: 'Producto dado de baja.', content: { 'application/json': { schema: z.object({ id: z.string().uuid() }) } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es dueño del comercio al que pertenece el producto (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'El producto no existe o ya no está disponible (PEA-COM-004).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
