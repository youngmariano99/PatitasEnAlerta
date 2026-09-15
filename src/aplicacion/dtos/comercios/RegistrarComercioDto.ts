import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/** Valores exactos del `CHECK tipo_comercio` de docs/SCHEMA.md — cualquier otro valor corta con PEA-COM-002. */
export const TIPOS_COMERCIO_SOPORTADOS = ['pet_shop', 'forrajeria', 'peluqueria', 'farmacia_veterinaria', 'otro'] as const;

/**
 * Contrato de entrada de "Registro de comercio en la plataforma" (Módulo 7,
 * Paso 1). `usuarioId` NO forma parte de este esquema: siempre se deriva de
 * la sesión autenticada en el route handler, nunca del body — mismo
 * criterio que `veterinarioId` en `ProductoVeterinarioDto.ts`.
 */
export const DatosComercioSchema = z.object({
  nombreComercio: z
    .string({ required_error: 'Ingresá el nombre de tu comercio.' })
    .trim()
    .min(1, 'Ingresá el nombre de tu comercio.')
    .max(150, 'El nombre no puede superar los 150 caracteres.'),
  tipoComercio: z.enum(TIPOS_COMERCIO_SOPORTADOS, {
    required_error: 'Elegí un tipo de comercio válido de la lista.',
    invalid_type_error: 'Elegí un tipo de comercio válido de la lista.',
  }),
  direccion: z
    .string({ required_error: 'Ingresá la dirección de tu comercio.' })
    .trim()
    .min(1, 'Ingresá la dirección de tu comercio.')
    .max(200, 'La dirección no puede superar los 200 caracteres.'),
  latitud: z.number({ required_error: 'No pudimos obtener tu ubicación. Marcala en el mapa.' }),
  longitud: z.number({ required_error: 'No pudimos obtener tu ubicación. Marcala en el mapa.' }),
});

export const RegistrarComercioSchema = registroOpenApi.register(
  'RegistrarComercioDto',
  DatosComercioSchema.openapi('RegistrarComercioDto'),
);
export type DatosRegistrarComercioDto = z.infer<typeof RegistrarComercioSchema>;

export interface ComandoRegistrarComercio extends DatosRegistrarComercioDto {
  usuarioId: string;
}

export const ComercioDtoSchema = registroOpenApi.register(
  'ComercioDto',
  z
    .object({
      id: z.string().uuid(),
      usuarioId: z.string().uuid(),
      nombreComercio: z.string(),
      tipoComercio: z.string(),
      direccion: z.string(),
      latitud: z.number(),
      longitud: z.number(),
      estadoVerificacion: z.string().openapi({ example: 'pendiente' }),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('ComercioDto'),
);
export type ComercioDto = z.infer<typeof ComercioDtoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/comercios',
  tags: ['Comercios'],
  summary: 'Registra el comercio del usuario autenticado (Módulo 7, Paso 2) — queda en estado_verificacion="pendiente" hasta la revisión del Administrador.',
  request: { body: { content: { 'application/json': { schema: RegistrarComercioSchema } } } },
  responses: {
    201: { description: 'Comercio registrado, pendiente de verificación.', content: { 'application/json': { schema: ComercioDtoSchema } } },
    400: {
      description: 'Payload inválido (PEA-SIS-005) o tipo_comercio fuera del catálogo (PEA-COM-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol comerciante (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
