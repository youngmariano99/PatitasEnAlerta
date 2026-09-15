import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

const TOPE_POR_PAGINA = 50;

/**
 * Query params de GET /foros-cursos/temas (Módulo 8, Paso 1: listado
 * paginado, tope 50 — NFR de Rendimiento, docs/REQUISITOS.md). Mismo
 * criterio de clamp con `.catch()` que `ListarReportesQuerySchema`: un valor
 * fuera de rango no rechaza la request, se ajusta al límite válido.
 */
export const ListarTemasForoQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});
export type ParametrosListarTemasForo = z.infer<typeof ListarTemasForoQuerySchema>;

export const TemaForoListadoSchema = registroOpenApi.register(
  'TemaForoListado',
  z
    .object({
      id: z.string().uuid(),
      creadoPor: z.string().uuid(),
      titulo: z.string(),
      contenido: z.string(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('TemaForoListado'),
);

export const PaginaTemasForoSchema = registroOpenApi.register(
  'PaginaTemasForo',
  z
    .object({
      items: z.array(TemaForoListadoSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaTemasForo'),
);
export type PaginaTemasForoDto = z.infer<typeof PaginaTemasForoSchema>;

export const RespuestaForoListadoSchema = registroOpenApi.register(
  'RespuestaForoListado',
  z
    .object({
      id: z.string().uuid(),
      temaId: z.string().uuid(),
      usuarioId: z.string().uuid(),
      contenido: z.string(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('RespuestaForoListado'),
);
export type RespuestaForoListadoDto = z.infer<typeof RespuestaForoListadoSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/foros-cursos/temas',
  tags: ['Foros y Cursos'],
  summary: 'Listado paginado (tope 50) de temas activos del foro — exige sesión activa (Módulo 8, Paso 1).',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
    }),
  },
  responses: {
    200: { description: 'Página de temas activos.', content: { 'application/json': { schema: PaginaTemasForoSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

const ParametrosTemaSchema = z.object({ id: z.string().uuid() });

registroOpenApi.registerPath({
  method: 'get',
  path: '/foros-cursos/temas/{id}/respuestas',
  tags: ['Foros y Cursos'],
  summary: 'Respuestas activas de un tema del foro, vía ix_respuestas_tema — exige sesión activa (Módulo 8, Paso 2).',
  request: { params: ParametrosTemaSchema },
  responses: {
    200: {
      description: 'Respuestas del tema, en orden cronológico. Lista vacía si el tema no tiene respuestas (o no existe).',
      content: { 'application/json': { schema: z.array(RespuestaForoListadoSchema) } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
