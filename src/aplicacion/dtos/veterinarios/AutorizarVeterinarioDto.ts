import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada de "Control de accesos a la libreta sanitaria"
 * (Módulo 4, Historia VET-05). El dueño elige el veterinario por su id —
 * mismo criterio que `ReservarTurnoDto.ts` con `proveedorId` — nunca por
 * email: no existe (ni lo pide esta actividad) un directorio público de
 * veterinarios para buscar por otro campo.
 *
 * `mascotaId` NO forma parte de este esquema: viaja como segmento de ruta
 * (`/mascotas/{id}/autorizaciones`), igual criterio que `veterinarioId` en
 * `RegistrarEntradaLibretaDto.ts` — siempre resuelto por el route handler,
 * nunca por el body.
 */
export const AutorizarVeterinarioSchema = registroOpenApi.register(
  'AutorizarVeterinarioDto',
  z
    .object({
      veterinarioId: z
        .string({ required_error: 'Indicá el veterinario al que querés autorizar.' })
        .uuid('El id del veterinario no es válido.')
        .openapi({ example: '22222222-2222-4222-8222-222222222222' }),
    })
    .openapi('AutorizarVeterinarioDto'),
);

export type DatosAutorizarVeterinarioDto = z.infer<typeof AutorizarVeterinarioSchema>;

/** Comando interno: el veterinario a autorizar + sobre qué mascota + quién autoriza, siempre resueltos por ruta/sesión. */
export interface ComandoAutorizarVeterinario extends DatosAutorizarVeterinarioDto {
  mascotaId: string;
  dueñoId: string;
}

export const AutorizacionLibretaDtoSchema = registroOpenApi.register(
  'AutorizacionLibretaDto',
  z
    .object({
      id: z.string().uuid(),
      mascotaId: z.string().uuid(),
      veterinarioId: z.string().uuid(),
      otorgadaEn: z.string(),
      revocadaEn: z.string().nullable(),
    })
    .openapi('AutorizacionLibretaDto'),
);

export type AutorizacionLibretaDto = z.infer<typeof AutorizacionLibretaDtoSchema>;

const ParametrosMascotaSchema = z.object({ id: z.string().uuid() });

registroOpenApi.registerPath({
  method: 'post',
  path: '/mascotas/{id}/autorizaciones',
  tags: ['Veterinarios'],
  summary:
    'El dueño autoriza a un veterinario a escribir en la libreta sanitaria de una mascota puntual (Módulo 4, VET-05).',
  request: {
    params: ParametrosMascotaSchema,
    body: { content: { 'application/json': { schema: AutorizarVeterinarioSchema } } },
  },
  responses: {
    201: {
      description: 'Autorización otorgada.',
      content: { 'application/json': { schema: AutorizacionLibretaDtoSchema } },
    },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'La mascota indicada no pertenece a quien invoca (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'La mascota o el veterinario indicado no existen (PEA-AUTH-009 / PEA-VET-011).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description: 'Ya existe una autorización activa para ese veterinario sobre esa mascota (PEA-VET-009).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});

registroOpenApi.registerPath({
  method: 'get',
  path: '/mascotas/{id}/autorizaciones',
  tags: ['Veterinarios'],
  summary:
    'Historial completo (vigentes y revocadas) de autorizaciones a veterinarios sobre la libreta sanitaria de una mascota — exclusivo del dueño.',
  request: { params: ParametrosMascotaSchema },
  responses: {
    200: {
      description: 'Historial de autorizaciones de la mascota, más reciente primero.',
      content: { 'application/json': { schema: z.array(AutorizacionLibretaDtoSchema) } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'La mascota indicada no pertenece a quien invoca (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: { description: 'La mascota indicada no existe (PEA-AUTH-009).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'delete',
  path: '/mascotas/{id}/autorizaciones/{veterinarioId}',
  tags: ['Veterinarios'],
  summary: 'El dueño revoca el acceso de un veterinario a la libreta sanitaria de una mascota puntual (Módulo 4, VET-05).',
  request: {
    params: z.object({ id: z.string().uuid(), veterinarioId: z.string().uuid() }),
  },
  responses: {
    200: { description: 'Autorización revocada.', content: { 'application/json': { schema: AutorizacionLibretaDtoSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'La mascota indicada no pertenece a quien invoca (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'No hay una autorización activa para ese veterinario sobre esa mascota (PEA-VET-010).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
