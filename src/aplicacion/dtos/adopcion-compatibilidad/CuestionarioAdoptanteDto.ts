import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { ESPACIOS_DISPONIBLES_SOPORTADOS } from '@dominio/entidades/CuestionarioAdoptante';

/**
 * Contrato de "Completar el cuestionario" (Módulo 9, Paso 1: insertar o
 * actualizar `cuestionarios_adoptante` con `usuario_id = usuario_actual()`).
 * Todos los campos son opcionales — docs/ERRORS.md, PEA-ADOP-001, "Acción
 * sugerida": permitir guardar avance parcial; `esCuestionarioCompleto`
 * (`@dominio/entidades/CuestionarioAdoptante`) decide después cuándo ese
 * avance alcanza para solicitar sugerencias de compatibilidad (Paso 3).
 * `usuarioId` NO forma parte de este esquema: siempre se resuelve del
 * usuario autenticado en el caso de uso, nunca del body del cliente.
 */
export const CompletarCuestionarioAdoptanteSchema = registroOpenApi.register(
  'CompletarCuestionarioAdoptanteDto',
  z
    .object({
      horasSoloEstimadas: z
        .number({ invalid_type_error: 'Las horas solo tienen que ser un número.' })
        .int('Las horas solo tienen que ser un número entero.')
        .min(0, 'Las horas solo no pueden ser negativas.')
        .max(24, 'Las horas solo no pueden superar las 24 por día.')
        .nullable()
        .optional()
        .transform((valor) => valor ?? null),
      presenciaNinos: z.boolean().nullable().optional().transform((valor) => valor ?? null),
      espacioDisponible: z
        .enum(ESPACIOS_DISPONIBLES_SOPORTADOS, { invalid_type_error: 'Elegí un espacio disponible válido.' })
        .nullable()
        .optional()
        .transform((valor) => valor ?? null),
      experienciaPrevia: z
        .string()
        .trim()
        .max(500, 'La experiencia previa no puede superar los 500 caracteres.')
        .nullable()
        .optional()
        .transform((valor) => (valor === '' ? null : valor ?? null)),
    })
    .openapi('CompletarCuestionarioAdoptanteDto'),
);
export type DatosCompletarCuestionarioAdoptanteDto = z.infer<typeof CompletarCuestionarioAdoptanteSchema>;
export interface ComandoCompletarCuestionarioAdoptante extends DatosCompletarCuestionarioAdoptanteDto {
  usuarioId: string;
}

export const CuestionarioAdoptanteDtoSchema = registroOpenApi.register(
  'CuestionarioAdoptanteDto',
  z
    .object({
      id: z.string().uuid(),
      usuarioId: z.string().uuid(),
      horasSoloEstimadas: z.number().nullable(),
      presenciaNinos: z.boolean().nullable(),
      espacioDisponible: z.string().nullable(),
      experienciaPrevia: z.string().nullable(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
      updatedAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('CuestionarioAdoptanteDto'),
);
export type CuestionarioAdoptanteDto = z.infer<typeof CuestionarioAdoptanteDtoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/adopcion-compatibilidad/cuestionario',
  tags: ['Adopción y Compatibilidad'],
  summary: 'Crea o actualiza el cuestionario de estilo de vida propio del usuario autenticado (Módulo 9, Paso 1).',
  request: { body: { content: { 'application/json': { schema: CompletarCuestionarioAdoptanteSchema } } } },
  responses: {
    201: { description: 'Cuestionario guardado (creado o actualizado).', content: { 'application/json': { schema: CuestionarioAdoptanteDtoSchema } } },
    400: { description: 'Payload inválido, incluye `espacioDisponible` fuera del catálogo (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'get',
  path: '/adopcion-compatibilidad/cuestionario',
  tags: ['Adopción y Compatibilidad'],
  summary: 'Consulta el cuestionario propio del usuario autenticado — nunca el de otro adoptante.',
  responses: {
    200: { description: 'Cuestionario propio.', content: { 'application/json': { schema: CuestionarioAdoptanteDtoSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    404: { description: 'Todavía no completaste ningún cuestionario (PEA-ADOP-003).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
