import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { opcionalDeTexto } from '@aplicacion/dtos/zod-helpers';

/**
 * Tipos de reporte que este endpoint acepta. 'problematica' (docs/SCHEMA.md,
 * CHECK tipo) queda para un ticket posterior reutilizando el mismo pipeline
 * — no es un reporte sobre una mascota concreta, así que no encaja con
 * `mascotaId`/`especie` tal como están modelados acá.
 */
export const TIPOS_REPORTE_SOPORTADOS = ['perdido', 'encontrado'] as const;
export type TipoReporte = (typeof TIPOS_REPORTE_SOPORTADOS)[number];

/**
 * Contrato de entrada compartido por "Reporte exprés de mascota perdida"
 * (REP-01) y "Reporte de mascota encontrada" (REP-02) — mismo caso de uso
 * CrearReporte, mismo pipeline de validación, solo cambia `tipo`. Enviar el
 * campo `tipo` ausente o con cualquier valor fuera de TIPOS_REPORTE_SOPORTADOS
 * corta la cadena en ValidadorEsquemaZod con PEA-REP-001.
 *
 * `mascotaId` es opcional en ambos flujos: quien encuentra una mascota
 * ajena no tiene (ni debería tener) una ficha propia que vincular.
 * `especie` también es opcional (texto libre, mismo criterio que
 * Mascota.especie) — cuando está presente, EvaluarCoincidenciaReporte la usa
 * junto con la zona para notificar coincidencias 'perdido' ↔ 'encontrado'
 * (REP-U-06); si se omite, ese reporte simplemente no participa del matching.
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
      tipo: z.enum(TIPOS_REPORTE_SOPORTADOS, {
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
      especie: opcionalDeTexto(40).openapi({ example: 'perro' }),
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
      especie: z.string().nullable(),
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
  summary: 'Publica un reporte exprés de mascota perdida o encontrada (REP-01 / REP-02)',
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
