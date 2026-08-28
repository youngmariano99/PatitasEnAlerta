import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

export const RecuperarPasswordSchema = registroOpenApi.register(
  'RecuperarPasswordDto',
  z
    .object({
      email: z
        .string({ required_error: 'El email es obligatorio.' })
        .trim()
        .toLowerCase()
        .email('El formato del email no parece válido. Ej: juan.perez@ejemplo.com')
        .openapi({ example: 'juan.perez@ejemplo.com' }),
    })
    .openapi('RecuperarPasswordDto'),
);

export type RecuperarPasswordDto = z.infer<typeof RecuperarPasswordSchema>;

/** El route handler agrega `redirectTo` a partir del origin de la request — nunca lo envía el cliente. */
export interface ComandoRecuperarPassword extends RecuperarPasswordDto {
  redirectTo: string;
}

export const RecuperacionSolicitadaSchema = registroOpenApi.register(
  'RecuperacionSolicitada',
  z
    .object({
      mensaje: z.string().openapi({
        example: 'Si existe una cuenta con ese email, te enviamos instrucciones para recuperar tu contraseña.',
      }),
    })
    .openapi('RecuperacionSolicitada'),
);

registroOpenApi.registerPath({
  method: 'post',
  path: '/auth/recuperar-password',
  tags: ['Autenticación'],
  summary: 'Solicita el email de recuperación de contraseña (AUTH-06). Respuesta anti-enumeración: idéntica exista o no la cuenta.',
  request: {
    body: { content: { 'application/json': { schema: RecuperarPasswordSchema } } },
  },
  responses: {
    200: {
      description: 'Solicitud procesada — el mensaje es siempre el mismo, exista o no la cuenta.',
      content: { 'application/json': { schema: RecuperacionSolicitadaSchema } },
    },
    400: {
      description: 'Payload inválido — falló la validación fail-fast de Zod.',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
