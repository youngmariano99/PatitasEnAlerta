import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { CursoDtoSchema } from '@aplicacion/dtos/foros-cursos/CursoDto';

const TOPE_POR_PAGINA = 50;

/** Query params de GET /foros-cursos/cursos — mismo criterio de clamp con `.catch()` que `ListarTemasForoQuerySchema`. */
export const ListarCursosQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});
export type ParametrosListarCursos = z.infer<typeof ListarCursosQuerySchema>;

export const PaginaCursosSchema = registroOpenApi.register(
  'PaginaCursos',
  z
    .object({
      items: z.array(CursoDtoSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaCursos'),
);
export type PaginaCursosDto = z.infer<typeof PaginaCursosSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/foros-cursos/cursos',
  tags: ['Foros y Cursos'],
  summary:
    'Listado paginado (tope 50) de cursos de tenencia responsable publicados — exige sesión activa (Módulo 8).',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Página de cursos publicados.',
      content: { 'application/json': { schema: PaginaCursosSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
