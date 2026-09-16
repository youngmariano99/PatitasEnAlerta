import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato compartido por alta y edición de un tema del foro (Módulo 8,
 * Historia "Publicación de contenido educativo en el foro", Paso 1: alta
 * abierta a cualquier autenticado; Paso 3: edición propia bloqueada tras
 * moderación). `creadoPor` NO forma parte de este esquema: siempre se
 * resuelve del usuario autenticado en el caso de uso, nunca del body del
 * cliente. `titulo`/`contenido` pasan por DOMPurify (Paso 1) antes de
 * persistir, no acá — este esquema solo valida forma y tipos; un valor
 * vacío tras `trim()` mapea a PEA-FORO-003 en el caso de uso, no al
 * PEA-SIS-005 genérico (ver CrearTemaForo.aErrorDeNegocio).
 */
export const DatosTemaForoSchema = z.object({
  titulo: z
    .string({ required_error: 'Escribí un contenido antes de publicar tu tema o respuesta.' })
    .trim()
    .min(1, 'Escribí un contenido antes de publicar tu tema o respuesta.')
    .max(200, 'El título no puede superar los 200 caracteres.'),
  contenido: z
    .string({ required_error: 'Escribí un contenido antes de publicar tu tema o respuesta.' })
    .trim()
    .min(1, 'Escribí un contenido antes de publicar tu tema o respuesta.')
    .max(5000, 'El contenido no puede superar los 5000 caracteres.'),
});

export const PublicarTemaForoSchema = registroOpenApi.register(
  'PublicarTemaForoDto',
  DatosTemaForoSchema.openapi('PublicarTemaForoDto'),
);
export type DatosPublicarTemaForoDto = z.infer<typeof PublicarTemaForoSchema>;
export interface ComandoCrearTemaForo extends DatosPublicarTemaForoDto {
  usuarioId: string;
}

export const EditarTemaForoSchema = registroOpenApi.register(
  'EditarTemaForoDto',
  DatosTemaForoSchema.openapi('EditarTemaForoDto'),
);
export type DatosEditarTemaForoDto = z.infer<typeof EditarTemaForoSchema>;
export interface ComandoEditarTemaForo extends DatosEditarTemaForoDto {
  temaId: string;
  usuarioId: string;
}

export const TemaForoDtoSchema = registroOpenApi.register(
  'TemaForoDto',
  z
    .object({
      id: z.string().uuid(),
      creadoPor: z.string().uuid(),
      titulo: z.string(),
      contenido: z.string(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('TemaForoDto'),
);
export type TemaForoDto = z.infer<typeof TemaForoDtoSchema>;

export const TemaForoModeradoDtoSchema = registroOpenApi.register(
  'TemaForoModeradoDto',
  z.object({ id: z.string().uuid() }).openapi('TemaForoModeradoDto'),
);
export type TemaForoModeradoDto = z.infer<typeof TemaForoModeradoDtoSchema>;

const ParametrosTemaSchema = z.object({ id: z.string().uuid() });

registroOpenApi.registerPath({
  method: 'post',
  path: '/foros-cursos/temas',
  tags: ['Foros y Cursos'],
  summary: 'Publica un tema del foro — abierto a cualquier usuario autenticado (Módulo 8, Paso 1).',
  request: { body: { content: { 'application/json': { schema: PublicarTemaForoSchema } } } },
  responses: {
    201: { description: 'Tema publicado.', content: { 'application/json': { schema: TemaForoDtoSchema } } },
    400: { description: 'Falta título o contenido (PEA-FORO-003).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'patch',
  path: '/foros-cursos/temas/{id}',
  tags: ['Foros y Cursos'],
  summary: 'Edita un tema propio — bloqueado si ya fue moderado por un Administrador (Módulo 8, Paso 3).',
  request: {
    params: ParametrosTemaSchema,
    body: { content: { 'application/json': { schema: EditarTemaForoSchema } } },
  },
  responses: {
    200: { description: 'Tema actualizado.', content: { 'application/json': { schema: TemaForoDtoSchema } } },
    400: { description: 'Falta título o contenido (PEA-FORO-003).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es el autor (PEA-SIS-002), o el tema ya fue moderado (PEA-FORO-004).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: { description: 'El tema no existe (PEA-FORO-002).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'post',
  path: '/foros-cursos/temas/{id}/moderar',
  tags: ['Foros y Cursos'],
  summary: 'Da de baja (soft delete) un tema por contenido inapropiado — exclusivo de rol administrador (Módulo 8, Paso 2).',
  request: { params: ParametrosTemaSchema },
  responses: {
    200: { description: 'Tema moderado.', content: { 'application/json': { schema: TemaForoModeradoDtoSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol administrador (PEA-SIS-002).', content: { 'application/json': { schema: ErrorApiSchema } } },
    404: { description: 'El tema no existe o ya estaba moderado (PEA-FORO-002).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
