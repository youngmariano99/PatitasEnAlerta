import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de alta de un curso (Módulo 8, Historia "Publicación de cursos de
 * tenencia responsable", Paso 1: alta restringida a `organizacion`/
 * `municipio`). `publicadoPor` NO forma parte de este esquema: siempre se
 * resuelve del usuario autenticado en el caso de uso, nunca del body del
 * cliente — mismo criterio que `comercioId` en `ProductoComercioDto.ts`.
 * `descripcion` pasa por DOMPurify (Paso 3) antes de persistir, no acá —
 * este esquema solo valida forma y tipos. `contenidoUrl` valida URL bien
 * formada (Paso 2, AC explícito del ticket).
 */
export const PublicarCursoSchema = registroOpenApi.register(
  'PublicarCursoDto',
  z
    .object({
      titulo: z
        .string({ required_error: 'Ingresá el título del curso.' })
        .trim()
        .min(1, 'Ingresá el título del curso.')
        .max(200, 'El título no puede superar los 200 caracteres.'),
      descripcion: z
        .string({ required_error: 'Ingresá una descripción del curso.' })
        .trim()
        .min(1, 'Ingresá una descripción del curso.')
        .max(2000, 'La descripción no puede superar los 2000 caracteres.'),
      contenidoUrl: z
        .string()
        .trim()
        .url('La URL del contenido no es válida.')
        .nullable()
        .optional()
        .transform((valor) => valor ?? null),
    })
    .openapi('PublicarCursoDto'),
);
export type DatosPublicarCursoDto = z.infer<typeof PublicarCursoSchema>;
export interface ComandoPublicarCurso extends DatosPublicarCursoDto {
  usuarioId: string;
}

export const CursoDtoSchema = registroOpenApi.register(
  'CursoDto',
  z
    .object({
      id: z.string().uuid(),
      publicadoPor: z.string().uuid(),
      titulo: z.string(),
      descripcion: z.string(),
      contenidoUrl: z.string().nullable(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('CursoDto'),
);
export type CursoDto = z.infer<typeof CursoDtoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/foros-cursos/cursos',
  tags: ['Foros y Cursos'],
  summary: 'Publica un curso de tenencia responsable — exclusivo de rol organizacion o municipio (Módulo 8, Paso 1).',
  request: { body: { content: { 'application/json': { schema: PublicarCursoSchema } } } },
  responses: {
    201: { description: 'Curso publicado.', content: { 'application/json': { schema: CursoDtoSchema } } },
    400: { description: 'Payload inválido, incluye `contenidoUrl` mal formada (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol organizacion ni municipio (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
