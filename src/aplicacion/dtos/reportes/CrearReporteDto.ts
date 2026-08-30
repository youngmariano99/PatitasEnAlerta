import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada del "Reporte exprés de mascota perdida" (Módulo 2).
 * `tipo` es un literal 'perdido' a propósito: este endpoint/formulario cubre
 * únicamente el flujo de mascota perdida de esta actividad — 'encontrado' y
 * 'problematica' (docs/SCHEMA.md, CHECK tipo) se habilitan en un ticket
 * posterior reutilizando el mismo pipeline. Enviar el campo `tipo` con
 * cualquier otro valor (o ausente) corta la cadena en ValidadorEsquemaZod.
 *
 * `latitud`/`longitud` solo se tipan acá (número finito) — el rango
 * geográfico plausible lo verifica el eslabón ValidadorGeolocalizacion del
 * pipeline (src/aplicacion/pipelines/ValidacionReporte.ts), no este DTO.
 *
 * `reportadoPor` NO forma parte de este esquema: igual que `dueñoId` en
 * RegistrarMascotaDto, siempre se deriva de la sesión autenticada en el
 * route handler (ver app/api/reportes/route.ts), nunca del body del cliente.
 */
export const CrearReporteSchema = registroOpenApi.register(
  'CrearReporteDto',
  z
    .object({
      tipo: z.literal('perdido', {
        required_error: 'Elegí una categoría para tu reporte antes de continuar.',
        invalid_type_error: 'Elegí una categoría para tu reporte antes de continuar.',
      }),
      descripcion: z
        .string({ required_error: 'Contanos brevemente qué pasó.' })
        .trim()
        .min(1, 'Contanos brevemente qué pasó.')
        .max(1000, 'La descripción no puede superar los 1000 caracteres.'),
      fotoUrl: z
        .string({ required_error: 'Necesitamos una foto para publicar el reporte.' })
        .url('La URL de la foto no es válida.')
        .openapi({ example: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg' }),
      latitud: z
        .number({ required_error: 'No pudimos obtener tu ubicación automáticamente. Marcala en el mapa.' })
        .finite('No pudimos obtener tu ubicación automáticamente. Marcala en el mapa.'),
      longitud: z
        .number({ required_error: 'No pudimos obtener tu ubicación automáticamente. Marcala en el mapa.' })
        .finite('No pudimos obtener tu ubicación automáticamente. Marcala en el mapa.'),
      mascotaId: z.string().uuid('El identificador de la mascota no es válido.').optional(),
    })
    .openapi('CrearReporteDto'),
);

export type DatosCrearReporteDto = z.infer<typeof CrearReporteSchema>;

/**
 * Comando interno del caso de uso: los datos del formulario + quién reporta,
 * siempre inyectado por el route handler a partir de la sesión verificada.
 */
export interface ComandoCrearReporte extends DatosCrearReporteDto {
  reportadoPor: string;
}

export const ReporteCreadoSchema = registroOpenApi.register(
  'ReporteCreado',
  z
    .object({
      id: z.string().uuid(),
      tipo: z.string(),
      reportadoPor: z.string().uuid(),
      mascotaId: z.string().uuid().nullable(),
      descripcion: z.string(),
      fotoUrl: z.string(),
      latitud: z.number(),
      longitud: z.number(),
      estado: z.string(),
      createdAt: z.string(),
    })
    .openapi('ReporteCreado'),
);

export type ReporteCreado = z.infer<typeof ReporteCreadoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/reportes',
  tags: ['Reportes'],
  summary: 'Publica un reporte exprés de mascota perdida (REP-01)',
  request: {
    body: { content: { 'application/json': { schema: CrearReporteSchema } } },
  },
  responses: {
    201: {
      description: 'Reporte creado correctamente, con estado inicial "reportado".',
      content: { 'application/json': { schema: ReporteCreadoSchema } },
    },
    400: {
      description:
        'Payload inválido, falta la categoría, la foto o la ubicación (PEA-REP-001 / PEA-REP-002 / PEA-REP-003 / PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    429: {
      description: 'Se superó el límite de reportes en poco tiempo (PEA-REP-004).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
