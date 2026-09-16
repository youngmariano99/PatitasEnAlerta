import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/** `cursoId` sale siempre del path, nunca del body — mismo criterio que el resto de rutas anidadas por id de este proyecto. */
export const ParametrosInscripcionSchema = z.object({ cursoId: z.string().uuid('El identificador del curso no es válido.') });
export type ComandoInscripcionCurso = z.infer<typeof ParametrosInscripcionSchema> & { usuarioId: string };

export const InscripcionCursoDtoSchema = registroOpenApi.register(
  'InscripcionCursoDto',
  z
    .object({
      id: z.string().uuid(),
      cursoId: z.string().uuid(),
      usuarioId: z.string().uuid(),
      inscritoEn: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('InscripcionCursoDto'),
);
export type InscripcionCursoDto = z.infer<typeof InscripcionCursoDtoSchema>;

const ParametrosRutaSchema = z.object({ id: z.string().uuid() });

registroOpenApi.registerPath({
  method: 'post',
  path: '/foros-cursos/cursos/{id}/inscripciones',
  tags: ['Foros y Cursos'],
  summary: 'Inscribe al usuario autenticado en un curso (Módulo 8, Paso 1) — exige sesión activa.',
  request: { params: ParametrosRutaSchema },
  responses: {
    201: { description: 'Inscripción creada.', content: { 'application/json': { schema: InscripcionCursoDtoSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    404: { description: 'El curso no existe (PEA-FORO-002).', content: { 'application/json': { schema: ErrorApiSchema } } },
    409: { description: 'Ya estás inscripto/a en este curso (PEA-FORO-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'delete',
  path: '/foros-cursos/cursos/{id}/inscripciones',
  tags: ['Foros y Cursos'],
  summary: 'Da de baja la inscripción propia del usuario autenticado a un curso (Módulo 8, Paso 3).',
  request: { params: ParametrosRutaSchema },
  responses: {
    200: { description: 'Inscripción dada de baja.', content: { 'application/json': { schema: z.object({ cursoId: z.string().uuid() }) } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    404: { description: 'No había inscripción propia activa para ese curso (PEA-FORO-002).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
