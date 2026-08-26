import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada del registro de dueño de mascota (AUTH-01).
 * Mensajes de error alineados 1:1 con docs/ERRORS.md (PEA-AUTH-003 para
 * formato de email inválido). La contraseña nunca se persiste — Supabase
 * Auth la hashea y la gestiona (ver docs/SEED.md, caveat de autenticación).
 */
export const RegistrarDuenoSchema = registroOpenApi.register(
  'RegistrarDuenoDto',
  z
    .object({
      email: z
        .string({ required_error: 'El email es obligatorio.' })
        .trim()
        .toLowerCase()
        .email('El formato del email no parece válido. Ej: juan.perez@ejemplo.com')
        .openapi({ example: 'juan.perez@ejemplo.com' }),
      password: z
        .string({ required_error: 'La contraseña es obligatoria.' })
        .min(8, 'La contraseña tiene que tener al menos 8 caracteres.')
        .max(72, 'La contraseña no puede superar los 72 caracteres.')
        .openapi({ description: 'Texto plano en tránsito; Supabase Auth la hashea, nunca se guarda acá.' }),
    })
    .openapi('RegistrarDuenoDto'),
);

export type RegistrarDuenoDto = z.infer<typeof RegistrarDuenoSchema>;

export const UsuarioRegistradoSchema = registroOpenApi.register(
  'UsuarioRegistrado',
  z
    .object({
      id: z.string().uuid().openapi({ example: '5b1f6f0a-2c3d-4e5f-8a9b-1234567890ab' }),
      email: z.string().email().openapi({ example: 'juan.perez@ejemplo.com' }),
      rolId: z.number().int().openapi({ example: 1, description: '1 = dueño de mascota' }),
    })
    .openapi('UsuarioRegistrado'),
);

export type UsuarioRegistrado = z.infer<typeof UsuarioRegistradoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/auth/registro',
  tags: ['Autenticación'],
  summary: 'Registra un nuevo dueño de mascota (AUTH-01)',
  request: {
    body: { content: { 'application/json': { schema: RegistrarDuenoSchema } } },
  },
  responses: {
    201: {
      description: 'Usuario registrado correctamente.',
      content: { 'application/json': { schema: UsuarioRegistradoSchema } },
    },
    400: {
      description: 'Payload inválido — falló la validación fail-fast de Zod.',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description: 'Ya existe una cuenta activa con ese email (PEA-AUTH-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
