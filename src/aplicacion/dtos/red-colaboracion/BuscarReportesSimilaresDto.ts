import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { TIPOS_REPORTE_SOPORTADOS } from '@aplicacion/dtos/reportes/CrearReporteDto';
import { ESTADOS_REPORTE_SOPORTADOS } from '@dominio/entidades/Reporte';

const TOPE_RESULTADOS = 20;

/**
 * Query params de GET /red-colaboracion/reportes/similares. `consulta` es el
 * único campo obligatorio — el texto libre que IGeneradorEmbeddings convierte
 * en vector para comparar contra `descripcion_embedding` (búsqueda híbrida:
 * similitud semántica + los mismos filtros exactos que ListarReportesDto).
 * `zona` sigue siendo todo-o-nada, mismo criterio y mensaje que
 * ListarReportesDto/ListarDirectorioAliadosDto.
 */
export const BuscarReportesSimilaresQuerySchema = z
  .object({
    consulta: z
      .string({ required_error: 'Escribí qué estás buscando, ej. "gato asustadizo con otros perros".' })
      .trim()
      .min(3, 'Escribí al menos 3 caracteres para buscar por similitud.')
      .max(300, 'La búsqueda admite hasta 300 caracteres.'),
    tipo: z.enum(TIPOS_REPORTE_SOPORTADOS).optional().catch(undefined),
    estado: z.enum(ESTADOS_REPORTE_SOPORTADOS).optional().catch(undefined),
    especie: z.string().trim().min(1).max(100).optional(),
    latitud: z.coerce.number().finite().optional(),
    longitud: z.coerce.number().finite().optional(),
    radioKm: z.coerce.number().positive().optional(),
    limite: z.coerce.number().int().min(1).max(TOPE_RESULTADOS).catch(TOPE_RESULTADOS),
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

export type DatosBuscarReportesSimilares = z.infer<typeof BuscarReportesSimilaresQuerySchema>;

/** Comando interno del caso de uso: los filtros del query + quién consulta, siempre resuelto por la sesión. */
export interface ComandoBuscarReportesSimilares extends DatosBuscarReportesSimilares {
  usuarioSolicitanteId: string;
}

export const ReporteSimilarSchema = registroOpenApi.register(
  'ReporteSimilar',
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
      similitud: z.number().min(0).max(1).openapi({ description: 'Similitud coseno con la consulta (1 = idéntico).' }),
    })
    .openapi('ReporteSimilar'),
);

export type ReporteSimilarDto = z.infer<typeof ReporteSimilarSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/red-colaboracion/reportes/similares',
  tags: ['Red de Colaboración'],
  summary:
    'Búsqueda híbrida (Post-MVP, Módulo 5/9) de reportes por similitud semántica de descripción (pgvector) combinada con filtros exactos (tipo/estado/especie/zona). Requiere sesión — mismos roles que el directorio de aliados.',
  request: {
    query: z.object({
      consulta: z.string().min(3).max(300).openapi({ example: 'gato asustadizo con otros perros' }),
      tipo: z.enum(TIPOS_REPORTE_SOPORTADOS).optional(),
      estado: z.enum(ESTADOS_REPORTE_SOPORTADOS).optional(),
      especie: z.string().optional(),
      latitud: z.coerce.number().optional(),
      longitud: z.coerce.number().optional(),
      radioKm: z.coerce.number().optional().openapi({ description: 'Requiere latitud y longitud también.' }),
      limite: z.coerce.number().int().min(1).max(TOPE_RESULTADOS).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Reportes ordenados por similitud semántica descendente, dentro del umbral mínimo de relevancia.',
      content: { 'application/json': { schema: z.array(ReporteSimilarSchema) } },
    },
    400: {
      description: 'Consulta faltante/demasiado corta, o filtro de zona incompleto (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'El rol del usuario autenticado no tiene acceso a esta búsqueda (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    503: {
      description: 'El proveedor de embeddings no respondió (PEA-SIS-004).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
