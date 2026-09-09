import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { TIPOS_ENTRADA_LIBRETA } from '@dominio/puertos/IRepositorioEntradasLibreta';

const TOPE_POR_PAGINA = 50;

export const ListarLibretaSanitariaQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});

export type ParametrosListarLibretaSanitaria = z.infer<typeof ListarLibretaSanitariaQuerySchema>;

export const EntradaLibretaDtoSchema = registroOpenApi.register(
  'EntradaLibretaDto',
  z
    .object({
      id: z.string().uuid(),
      mascotaId: z.string().uuid(),
      veterinarioId: z.string().uuid(),
      tipo: z.enum(TIPOS_ENTRADA_LIBRETA),
      descripcion: z.string(),
      fecha: z.string().openapi({ description: 'AAAA-MM-DD' }),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('EntradaLibretaDto'),
);

export const PaginaEntradasLibretaSchema = registroOpenApi.register(
  'PaginaEntradasLibreta',
  z
    .object({
      items: z.array(EntradaLibretaDtoSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaEntradasLibreta'),
);

export type PaginaEntradasLibretaDto = z.infer<typeof PaginaEntradasLibretaSchema>;

const ParametrosMascotaSchema = z.object({ id: z.string().uuid() });

registroOpenApi.registerPath({
  method: 'get',
  path: '/mascotas/{id}/libreta',
  tags: ['Veterinarios'],
  summary:
    'Historial cronológico completo de la libreta sanitaria de una mascota (Módulo 4), paginado (tope 50), más reciente primero — exclusivo del dueño.',
  request: {
    params: ParametrosMascotaSchema,
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Página del historial cronológico de la mascota.',
      content: { 'application/json': { schema: PaginaEntradasLibretaSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'La mascota indicada no pertenece a quien invoca (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: { description: 'La mascota indicada no existe (PEA-AUTH-009).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
