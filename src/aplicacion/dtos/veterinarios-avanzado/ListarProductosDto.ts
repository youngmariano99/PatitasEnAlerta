import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { ProductoVeterinarioSchema } from '@aplicacion/dtos/veterinarios-avanzado/ProductoVeterinarioDto';

const TOPE_POR_PAGINA = 50;

export const ListarProductosQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});
export type ParametrosListarProductos = z.infer<typeof ListarProductosQuerySchema>;

export const PaginaProductosSchema = registroOpenApi.register(
  'PaginaProductosVeterinario',
  z
    .object({
      items: z.array(ProductoVeterinarioSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaProductosVeterinario'),
);
export type PaginaProductosDto = z.infer<typeof PaginaProductosSchema>;

const QUERY_PAGINACION = z.object({
  pagina: z.coerce.number().int().min(1).optional(),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
});

registroOpenApi.registerPath({
  method: 'get',
  path: '/veterinarios/productos/mis-productos',
  tags: ['Veterinarios Avanzado'],
  summary: 'Catálogo propio del veterinario autenticado, paginado (tope 50) — incluye productos sin stock.',
  request: { query: QUERY_PAGINACION },
  responses: {
    200: { description: 'Página del catálogo propio.', content: { 'application/json': { schema: PaginaProductosSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol veterinario (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});

registroOpenApi.registerPath({
  method: 'get',
  path: '/veterinarios/productos',
  tags: ['Veterinarios Avanzado'],
  summary: 'Catálogo público de productos veterinarios activos (de cualquier veterinario), paginado (tope 50) — sin sesión.',
  request: { query: QUERY_PAGINACION },
  responses: {
    200: { description: 'Página del catálogo público.', content: { 'application/json': { schema: PaginaProductosSchema } } },
  },
});
