import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { ROLES_DIRECTORIO_ALIADOS } from '@dominio/puertos/IRepositorioDirectorioAliados';

const TOPE_POR_PAGINA = 50;

/**
 * Query params de GET /red-colaboracion/directorio. `zona` es todo-o-nada
 * (mismo criterio y mensaje que ListarReportesDto.ts): si se declara alguno
 * de `latitud`/`longitud`/`radioKm` hay que declarar los tres.
 *
 * `rol` fuera de catálogo se ignora (`.catch(undefined)`) en vez de
 * rechazar la request — un filtro de listado inválido no amerita un 400
 * duro, mismo criterio que `tipo`/`estado` en ListarReportesDto.
 */
export const ListarDirectorioAliadosQuerySchema = z
  .object({
    pagina: z.coerce.number().int().min(1).catch(1),
    porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
    rol: z.enum(ROLES_DIRECTORIO_ALIADOS).optional().catch(undefined),
    latitud: z.coerce.number().finite().optional(),
    longitud: z.coerce.number().finite().optional(),
    radioKm: z.coerce.number().positive().optional(),
  })
  .superRefine((datos, ctx) => {
    const campos = [datos.latitud, datos.longitud, datos.radioKm];
    const cantidadDeclarada = campos.filter((valor) => valor !== undefined).length;
    if (cantidadDeclarada > 0 && cantidadDeclarada < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['zona'],
        message: 'Para filtrar por zona, indicá latitud, longitud y radioKm juntos.',
      });
    }
  });

export type DatosListarDirectorioAliadosDto = z.infer<typeof ListarDirectorioAliadosQuerySchema>;

/** Comando interno del caso de uso: los filtros del query + quién consulta, siempre resuelto por la sesión. */
export interface ComandoListarDirectorioAliados extends DatosListarDirectorioAliadosDto {
  usuarioSolicitanteId: string;
}

export const AliadoDirectorioSchema = registroOpenApi.register(
  'AliadoDirectorio',
  z
    .object({
      id: z.string().uuid(),
      rol: z.string(),
      email: z.string(),
      estadoVerificacion: z.string(),
      matricula: z.string().nullable().openapi({ description: 'Solo para rol veterinario.' }),
      colegioEmisor: z.string().nullable().openapi({ description: 'Solo para rol veterinario.' }),
      latitud: z.number().nullable(),
      longitud: z.number().nullable(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('AliadoDirectorio'),
);

export const PaginaDirectorioAliadosSchema = registroOpenApi.register(
  'PaginaDirectorioAliados',
  z
    .object({
      items: z.array(AliadoDirectorioSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaDirectorioAliados'),
);

export type PaginaDirectorioAliadosDto = z.infer<typeof PaginaDirectorioAliadosSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/red-colaboracion/directorio',
  tags: ['Red de Colaboración'],
  summary:
    'Directorio de aliados verificados (organizacion/ONG, veterinario, rescatista), paginado (tope 50) y filtrable por rol y zona. Requiere sesión — exclusivo de roles participantes de la Red de Colaboración (organizacion, veterinario, rescatista) o con visibilidad total (municipio, administrador).',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
      rol: z.enum(ROLES_DIRECTORIO_ALIADOS).optional(),
      latitud: z.coerce.number().optional(),
      longitud: z.coerce.number().optional(),
      radioKm: z.coerce.number().optional().openapi({ description: 'Requiere latitud y longitud también.' }),
    }),
  },
  responses: {
    200: {
      description: 'Página de aliados verificados que cumplen los filtros aplicados.',
      content: { 'application/json': { schema: PaginaDirectorioAliadosSchema } },
    },
    400: {
      description: 'Filtro de zona incompleto (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'El rol del usuario autenticado no tiene acceso al directorio (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
