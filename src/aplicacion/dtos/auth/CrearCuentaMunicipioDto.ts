import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { RegistrarDuenoSchema } from '@aplicacion/dtos/auth/RegistrarDuenoDto';

/**
 * Extiende el esquema base (email + password) con el nombre institucional
 * (AUTH-03). Es el mismo "producto" que PerfilFormularioFactory.crear('municipio')
 * expone para esa familia — se define acá porque este es el primer (y único)
 * consumidor real: un endpoint exclusivo de Administrador, nunca el
 * formulario público de /auth/registro.
 */
export const CrearCuentaMunicipioSchema = registroOpenApi.register(
  'CrearCuentaMunicipioDto',
  RegistrarDuenoSchema.extend({
    nombreInstitucional: z
      .string({ required_error: 'Ingresá el nombre de la institución.' })
      .trim()
      .min(1, 'Ingresá el nombre de la institución.')
      .max(150, 'El nombre institucional no puede superar los 150 caracteres.')
      .openapi({ example: 'Municipalidad de Coronel Pringles — Zoonosis' }),
  }).openapi('CrearCuentaMunicipioDto'),
);

export type CrearCuentaMunicipioDto = z.infer<typeof CrearCuentaMunicipioSchema>;

export interface ComandoCrearCuentaMunicipio extends CrearCuentaMunicipioDto {
  /** id de quien invoca el endpoint (resuelto por el route handler desde la sesión, nunca del body). */
  solicitanteId: string;
}

export const MunicipioCreadoSchema = registroOpenApi.register(
  'MunicipioCreado',
  z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      nombreInstitucional: z.string(),
      estadoVerificacion: z.string().openapi({ example: 'verificado' }),
    })
    .openapi('MunicipioCreado'),
);

export type MunicipioCreado = z.infer<typeof MunicipioCreadoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/admin/municipio',
  tags: ['Administración'],
  summary: 'Da de alta la cuenta institucional del Municipio (AUTH-03) — exclusivo de rol administrador.',
  request: {
    body: { content: { 'application/json': { schema: CrearCuentaMunicipioSchema } } },
  },
  responses: {
    201: {
      description: 'Cuenta institucional creada, ya verificada.',
      content: { 'application/json': { schema: MunicipioCreadoSchema } },
    },
    400: {
      description: 'Payload inválido (Zod fail-fast).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    403: {
      description: 'Quien invoca no tiene rol administrador (PEA-AUTH-011).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description: 'Email ya registrado (PEA-AUTH-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
