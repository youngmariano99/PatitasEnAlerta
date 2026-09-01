import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Query params de GET /municipio/dashboard/exportar (MUN-05, Historia
 * "Exportación de resumen de actividad"). A diferencia de
 * ObtenerDashboardMunicipalQuerySchema (donde el rango es opcional: "sin
 * fecha" simplemente no filtra), acá `periodoDesde`/`periodoHasta` son
 * OBLIGATORIOS — no tiene sentido "exportar todo el histórico" como acción
 * explícita de descarga, y el AC de este ticket habla de "un rango de
 * fechas" siempre presente.
 *
 * El `refine` que exige `periodoHasta > periodoDesde` corta con el mismo
 * código concreto (PEA-MUN-007) que docs/ERRORS.md ya documenta para esta
 * historia — mapeado explícitamente en ExportarDashboardMunicipal.ts
 * (mismo criterio que CrearEventoDto/PEA-MUN-004), nunca cae en el
 * PEA-SIS-005 genérico.
 */
export const ExportarDashboardMunicipalQuerySchema = z
  .object({
    periodoDesde: z.coerce.date({
      required_error: 'Elegí desde qué fecha exportar.',
      invalid_type_error: 'La fecha "desde" no es válida.',
    }),
    periodoHasta: z.coerce.date({
      required_error: 'Elegí hasta qué fecha exportar.',
      invalid_type_error: 'La fecha "hasta" no es válida.',
    }),
  })
  .refine((datos) => datos.periodoHasta > datos.periodoDesde, {
    message: 'El rango de fechas elegido no es válido para exportar el resumen.',
    path: ['periodoHasta'],
  });

export type ParametrosExportarDashboardMunicipal = z.infer<typeof ExportarDashboardMunicipalQuerySchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/municipio/dashboard/exportar',
  tags: ['Municipio'],
  summary:
    'Exporta a CSV el resumen de actividad municipal (reportes/turnos) del rango indicado — mismos datos agregados que GET /municipio/dashboard, nunca las tablas transaccionales en vivo. Exclusivo de rol municipio o administrador.',
  request: {
    query: z.object({
      periodoDesde: z.coerce.date().openapi({ description: 'Inicio del rango a exportar (ISO 8601), obligatorio.' }),
      periodoHasta: z.coerce.date().openapi({ description: 'Fin del rango a exportar (ISO 8601), obligatorio — tiene que ser posterior a periodoDesde.' }),
    }),
  },
  responses: {
    200: {
      description:
        'Archivo CSV con dos secciones (métricas de reportes y de turnos), servido con Content-Disposition: attachment y nombre de archivo con la fecha de generación.',
      content: { 'text/csv': { schema: { type: 'string' } } },
    },
    400: { description: 'Rango de fechas faltante o inválido (fin anterior/igual a inicio) — PEA-MUN-007.', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol municipio/administrador (PEA-MUN-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
