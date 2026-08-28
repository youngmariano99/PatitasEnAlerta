import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

// Convierte '' (campo de texto opcional vacío en un <input>) a `undefined`,
// para no persistir cadenas vacías como si fueran un dato real.
const opcionalDeTexto = (maximo: number) =>
  z.preprocess(
    (valor) => (valor === '' ? undefined : valor),
    z.string().trim().max(maximo).optional(),
  );

/**
 * Contrato de entrada del alta de mascota (AUTH-04). `dueñoId` NO forma
 * parte de este esquema a propósito: el dueño siempre se deriva de la
 * sesión autenticada en el route handler (nunca del body del cliente) — ver
 * app/api/mascotas/route.ts. Este DTO documenta únicamente los campos que
 * el formulario realmente envía.
 */
export const RegistrarMascotaSchema = registroOpenApi.register(
  'RegistrarMascotaDto',
  z
    .object({
      nombre: z
        .string({ required_error: 'El nombre de tu mascota es obligatorio.' })
        .trim()
        .min(1, 'El nombre de tu mascota es obligatorio.')
        .max(80, 'El nombre no puede superar los 80 caracteres.'),
      especie: z
        .string({ required_error: 'Contanos qué especie es tu mascota.' })
        .trim()
        .min(1, 'Contanos qué especie es tu mascota.')
        .max(40, 'La especie no puede superar los 40 caracteres.')
        .openapi({ example: 'perro' }),
      fotoUrl: z
        .string({ required_error: 'Necesitamos al menos una foto de tu mascota para completar el registro.' })
        .url('La URL de la foto no es válida.')
        .openapi({ example: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/toby.jpg' }),
      raza: opcionalDeTexto(80).openapi({ example: 'Mestizo' }),
      edadAproximada: z
        .number({ invalid_type_error: 'La edad tiene que ser un número.' })
        .int('La edad tiene que ser un número entero.')
        .min(0, 'La edad no puede ser negativa.')
        .optional(),
      identificacionChip: opcionalDeTexto(50),
    })
    .openapi('RegistrarMascotaDto'),
);

export type DatosMascotaDto = z.infer<typeof RegistrarMascotaSchema>;

/**
 * Comando interno del caso de uso: los datos del formulario + el dueño,
 * siempre inyectado por el route handler a partir de la sesión verificada.
 */
export interface ComandoRegistrarMascota extends DatosMascotaDto {
  dueñoId: string;
}

export const MascotaRegistradaSchema = registroOpenApi.register(
  'MascotaRegistrada',
  z
    .object({
      id: z.string().uuid(),
      dueñoId: z.string().uuid(),
      nombre: z.string(),
      especie: z.string(),
      fotoUrl: z.string(),
      raza: z.string().nullable(),
      edadAproximada: z.number().nullable(),
      identificacionChip: z.string().nullable(),
    })
    .openapi('MascotaRegistrada'),
);

export type MascotaRegistrada = z.infer<typeof MascotaRegistradaSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/mascotas',
  tags: ['Mascotas'],
  summary: 'Registra la ficha básica de una mascota del dueño autenticado (AUTH-04)',
  request: {
    body: { content: { 'application/json': { schema: RegistrarMascotaSchema } } },
  },
  responses: {
    201: {
      description: 'Mascota registrada correctamente.',
      content: { 'application/json': { schema: MascotaRegistradaSchema } },
    },
    400: {
      description: 'Payload inválido o falta la foto (PEA-AUTH-010 / PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    403: {
      description: 'El dueño declarado no coincide con el usuario autenticado (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
