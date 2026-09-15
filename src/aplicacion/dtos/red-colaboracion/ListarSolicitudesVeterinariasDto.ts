import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

const TOPE_POR_PAGINA = 50;

/**
 * Query params de GET /red-colaboracion/solicitudes/veterinaria. `zona` es
 * todo-o-nada (mismo criterio y mensaje que ListarDirectorioAliadosDto.ts /
 * ListarReportesDto.ts): si se declara alguno de
 * `latitud`/`longitud`/`radioKm` hay que declarar los tres.
 */
export const ListarSolicitudesVeterinariasQuerySchema = z
  .object({
    pagina: z.coerce.number().int().min(1).catch(1),
    porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
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

export type DatosListarSolicitudesVeterinariasDto = z.infer<typeof ListarSolicitudesVeterinariasQuerySchema>;

/** Comando interno del caso de uso: los filtros del query + quién consulta, siempre resuelto por la sesión. */
export interface ComandoListarSolicitudesVeterinarias extends DatosListarSolicitudesVeterinariasDto {
  veterinarioId: string;
}

export const SolicitudVeterinariaListadaSchema = registroOpenApi.register(
  'SolicitudVeterinariaListada',
  z
    .object({
      id: z.string().uuid(),
      organizacionId: z.string().uuid(),
      tipo: z.string().openapi({ example: 'asistencia_veterinaria' }),
      descripcion: z.string(),
      reporteId: z.string().uuid().nullable(),
      estado: z.string().openapi({ example: 'abierta' }),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('SolicitudVeterinariaListada'),
);

export const PaginaSolicitudesVeterinariasSchema = registroOpenApi.register(
  'PaginaSolicitudesVeterinarias',
  z
    .object({
      items: z.array(SolicitudVeterinariaListadaSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaSolicitudesVeterinarias'),
);

export type PaginaSolicitudesVeterinariasDto = z.infer<typeof PaginaSolicitudesVeterinariasSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/red-colaboracion/solicitudes/veterinaria',
  tags: ['Red de Colaboración'],
  summary:
    'Solicitudes de recurso tipo asistencia_veterinaria en estado abierta, paginadas (tope 50) y filtrables por zona de la organización dueña — exclusivo de rol veterinario.',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
      latitud: z.coerce.number().optional(),
      longitud: z.coerce.number().optional(),
      radioKm: z.coerce.number().optional().openapi({ description: 'Requiere latitud y longitud también.' }),
    }),
  },
  responses: {
    200: {
      description: 'Página de solicitudes de asistencia veterinaria abiertas que cumplen los filtros aplicados.',
      content: { 'application/json': { schema: PaginaSolicitudesVeterinariasSchema } },
    },
    400: {
      description: 'Filtro de zona incompleto (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol veterinario (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
