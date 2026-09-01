import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { TIPOS_REPORTE_SOPORTADOS } from '@aplicacion/dtos/reportes/CrearReporteDto';
import { ESTADOS_REPORTE_SOPORTADOS } from '@dominio/entidades/Reporte';

const TOPE_POR_PAGINA = 50;

/**
 * Query params de GET /reportes (listado público, sin login — ver
 * app/api/reportes/route.ts). `zona` es todo-o-nada: si se declara alguno de
 * `latitud`/`longitud`/`radioKm` hay que declarar los tres (`superRefine`
 * más abajo), nunca un filtro geográfico a medias.
 *
 * Valores fuera de catálogo en `tipo`/`estado` (`.catch(undefined)`) se
 * ignoran en vez de rechazar la request — un filtro de listado inválido no
 * amerita un 400 duro como en un alta: simplemente no se aplica ese filtro.
 */
export const ListarReportesQuerySchema = z
  .object({
    pagina: z.coerce.number().int().min(1).catch(1),
    porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
    tipo: z
      .enum(TIPOS_REPORTE_SOPORTADOS)
      .optional()
      .catch(undefined),
    estado: z
      .enum(ESTADOS_REPORTE_SOPORTADOS)
      .optional()
      .catch(undefined),
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

export type ParametrosListarReportes = z.infer<typeof ListarReportesQuerySchema>;

export const ReporteListadoSchema = registroOpenApi.register(
  'ReporteListado',
  z
    .object({
      id: z.string().uuid(),
      tipo: z.string(),
      subtipo: z.string().nullable(),
      descripcion: z.string(),
      fotoUrl: z.string(),
      latitud: z.number(),
      longitud: z.number(),
      especie: z.string().nullable(),
      estado: z.string(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('ReporteListado'),
);

export const PaginaReportesSchema = registroOpenApi.register(
  'PaginaReportes',
  z
    .object({
      items: z.array(ReporteListadoSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaReportes'),
);

export type PaginaReportesDto = z.infer<typeof PaginaReportesSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/reportes',
  tags: ['Reportes'],
  summary:
    'Listado público y paginado (tope 50) de reportes activos, con filtros de tipo/estado/zona. Sin autenticación (GRANT SELECT a anon).',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
      tipo: z.enum(TIPOS_REPORTE_SOPORTADOS).optional(),
      estado: z.enum(ESTADOS_REPORTE_SOPORTADOS).optional().openapi({
        description: 'Si se omite, solo se listan reportes activos (reportado/en_revision/en_atencion).',
      }),
      latitud: z.coerce.number().optional(),
      longitud: z.coerce.number().optional(),
      radioKm: z.coerce.number().optional().openapi({ description: 'Requiere latitud y longitud también.' }),
    }),
  },
  responses: {
    200: {
      description: 'Página de reportes que cumplen los filtros aplicados.',
      content: { 'application/json': { schema: PaginaReportesSchema } },
    },
    400: {
      description: 'Filtro de zona incompleto (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
