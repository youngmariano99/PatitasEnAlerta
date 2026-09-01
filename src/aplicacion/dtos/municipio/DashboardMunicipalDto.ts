import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { TIPOS_REPORTE_SOPORTADOS } from '@aplicacion/dtos/reportes/CrearReporteDto';

/**
 * Query params de GET /municipio/dashboard. `zona` es todo-o-nada (igual
 * criterio que ListarReportesQuerySchema): si se declara alguno de
 * `latitud`/`longitud`/`radioKm` hay que declarar los tres.
 */
export const ObtenerDashboardMunicipalQuerySchema = z
  .object({
    periodoDesde: z.coerce.date({ invalid_type_error: 'La fecha "desde" no es válida.' }).optional(),
    periodoHasta: z.coerce.date({ invalid_type_error: 'La fecha "hasta" no es válida.' }).optional(),
    tipoReporte: z.enum(TIPOS_REPORTE_SOPORTADOS).optional().catch(undefined),
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
    if (datos.periodoDesde && datos.periodoHasta && datos.periodoDesde > datos.periodoHasta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['periodoDesde'],
        message: 'La fecha "desde" tiene que ser anterior a la fecha "hasta".',
      });
    }
  });

export type ParametrosObtenerDashboardMunicipal = z.infer<typeof ObtenerDashboardMunicipalQuerySchema>;

const MetricaReportePeriodoSchema = registroOpenApi.register(
  'MetricaReportePeriodo',
  z
    .object({
      periodo: z.string().datetime(),
      tipo: z.string(),
      estado: z.string(),
      zonaLat: z.number(),
      zonaLng: z.number(),
      total: z.number().int(),
    })
    .openapi('MetricaReportePeriodo'),
);

const MetricaTurnoPeriodoSchema = registroOpenApi.register(
  'MetricaTurnoPeriodo',
  z
    .object({
      periodo: z.string().datetime(),
      proveedorTipo: z.string(),
      estado: z.string(),
      total: z.number().int(),
    })
    .openapi('MetricaTurnoPeriodo'),
);

export const DashboardMunicipalSchema = registroOpenApi.register(
  'DashboardMunicipal',
  z
    .object({
      metricasReportes: z.array(MetricaReportePeriodoSchema),
      metricasTurnos: z.array(MetricaTurnoPeriodoSchema),
    })
    .openapi('DashboardMunicipal'),
);

export type DashboardMunicipalDto = z.infer<typeof DashboardMunicipalSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/municipio/dashboard',
  tags: ['Municipio'],
  summary:
    'Dashboard analítico municipal — métricas agregadas de reportes y turnos, exclusivamente sobre vistas materializadas (mv_metricas_reportes_periodo / mv_metricas_turnos_periodo). Exclusivo de rol municipio o administrador.',
  request: {
    query: z.object({
      periodoDesde: z.coerce.date().optional().openapi({ description: 'Filtra por periodo >= periodoDesde (ISO 8601).' }),
      periodoHasta: z.coerce.date().optional().openapi({ description: 'Filtra por periodo <= periodoHasta (ISO 8601).' }),
      tipoReporte: z.enum(TIPOS_REPORTE_SOPORTADOS).optional(),
      latitud: z.coerce.number().optional(),
      longitud: z.coerce.number().optional(),
      radioKm: z.coerce.number().optional().openapi({ description: 'Requiere latitud y longitud también.' }),
    }),
  },
  responses: {
    200: {
      description: 'Métricas agregadas por período, ya listas para graficar (barras/tendencia) y para el mapa de calor.',
      content: { 'application/json': { schema: DashboardMunicipalSchema } },
    },
    400: { description: 'Filtro de zona incompleto o rango de fechas inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol municipio/administrador (PEA-MUN-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
