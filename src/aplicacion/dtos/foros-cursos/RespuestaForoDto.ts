import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { RespuestaForoListadoSchema } from '@aplicacion/dtos/foros-cursos/ListarForoDto';

/** Contrato de alta de una respuesta — mismo criterio de `contenido` vacío tras `trim()` que `DatosTemaForoSchema` (mapea a PEA-FORO-003, no al PEA-SIS-005 genérico). */
export const CrearRespuestaForoSchema = z.object({
  contenido: z
    .string({ required_error: 'Escribí un contenido antes de publicar tu tema o respuesta.' })
    .trim()
    .min(1, 'Escribí un contenido antes de publicar tu tema o respuesta.')
    .max(5000, 'El contenido no puede superar los 5000 caracteres.'),
});
export type DatosCrearRespuestaForo = z.infer<typeof CrearRespuestaForoSchema>;

export interface ComandoCrearRespuestaForo extends DatosCrearRespuestaForo {
  temaId: string;
  usuarioId: string;
}

const ParametrosTemaSchema = z.object({ id: z.string().uuid() });

registroOpenApi.registerPath({
  method: 'post',
  path: '/foros-cursos/temas/{id}/respuestas',
  tags: ['Foros y Cursos'],
  summary:
    'Publica una respuesta a un tema del foro — abierto a cualquier usuario autenticado (Módulo 8).',
  request: {
    params: ParametrosTemaSchema,
    body: { content: { 'application/json': { schema: CrearRespuestaForoSchema } } },
  },
  responses: {
    201: {
      description: 'Respuesta publicada.',
      content: { 'application/json': { schema: RespuestaForoListadoSchema } },
    },
    400: {
      description: 'Falta contenido (PEA-FORO-003).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
