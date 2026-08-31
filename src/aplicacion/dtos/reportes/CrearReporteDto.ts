import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { opcionalDeTexto } from '@aplicacion/dtos/zod-helpers';

/** Tipos de reporte que este endpoint acepta (docs/SCHEMA.md, CHECK tipo). */
export const TIPOS_REPORTE_SOPORTADOS = ['perdido', 'encontrado', 'problematica'] as const;
export type TipoReporte = (typeof TIPOS_REPORTE_SOPORTADOS)[number];

/**
 * Subtipos válidos exclusivamente para `tipo='problematica'` (docs/SCHEMA.md,
 * CHECK subtipo). Selección visual obligatoria en la UI — nunca texto libre
 * (NFR de validación de esquema estricta, Módulo 2).
 */
export const SUBTIPOS_PROBLEMATICA_SOPORTADOS = ['animal_suelto', 'foco_sanitario', 'accidente_vial'] as const;
export type SubtipoProblematica = (typeof SUBTIPOS_PROBLEMATICA_SOPORTADOS)[number];

/**
 * Contrato de entrada compartido por "Reporte exprés de mascota perdida"
 * (REP-01), "Reporte de mascota encontrada" (REP-02) y "Reporte de
 * problemática urbana" (REP-03) — mismo caso de uso CrearReporte, mismo
 * pipeline de validación, solo cambia `tipo` (y, para 'problematica',
 * `subtipo`). Enviar el campo `tipo` ausente o con cualquier valor fuera de
 * TIPOS_REPORTE_SOPORTADOS corta la cadena en ValidadorEsquemaZod con
 * PEA-REP-001.
 *
 * `mascotaId` es opcional en 'perdido'/'encontrado' (quien encuentra una
 * mascota ajena no tiene por qué tener una ficha propia que vincular) y
 * CrearReporte.ts lo fuerza a `null` siempre que `tipo='problematica'` — una
 * problemática urbana (animal suelto sin dueño identificado, foco sanitario,
 * accidente vial) nunca está vinculada a una mascota registrada.
 *
 * `subtipo` es obligatorio y limitado a SUBTIPOS_PROBLEMATICA_SOPORTADOS
 * únicamente cuando `tipo='problematica'` (docs/SCHEMA.md, CHECK subtipo) —
 * ver el `superRefine` más abajo. Para 'perdido'/'encontrado' se ignora si
 * llega (CrearReporte.ts lo persiste como `null` en esos casos).
 *
 * `especie` es opcional (texto libre, mismo criterio que Mascota.especie) —
 * cuando está presente en un reporte 'encontrado', EvaluarCoincidenciaReporte
 * la usa junto con la zona para notificar coincidencias con 'perdido'
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
      subtipo: z
        .enum(SUBTIPOS_PROBLEMATICA_SOPORTADOS, {
          invalid_type_error: 'Elegí un motivo válido para tu reporte de problemática.',
        })
        .optional(),
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
    .superRefine((datos, ctx) => {
      if (datos.tipo === 'problematica' && !datos.subtipo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subtipo'],
          message: 'Elegí un motivo para tu reporte de problemática.',
        });
      }
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
      subtipo: z.string().nullable(),
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
  summary: 'Publica un reporte de mascota perdida, encontrada o de problemática urbana (REP-01 / REP-02 / REP-03)',
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
