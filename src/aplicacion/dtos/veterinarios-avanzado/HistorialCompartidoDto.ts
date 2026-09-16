import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada de "Historia clínica interoperable entre
 * veterinarios" (Módulo 6). `veterinarioOrigenId` NO viaja en el body:
 * siempre es quien invoca (sesión), mismo criterio que `mascotaId` en
 * `AutorizarVeterinarioDto.ts` — nunca confiar en un id de origen elegido
 * por el propio cliente.
 */
export const CompartirHistorialSchema = registroOpenApi.register(
  'CompartirHistorialDto',
  z
    .object({
      mascotaId: z.string({ required_error: 'Indicá sobre qué mascota compartís el historial.' }).uuid('El id de la mascota no es válido.'),
      veterinarioDestinoId: z
        .string({ required_error: 'Indicá con qué veterinario/a compartís el historial.' })
        .uuid('El id del veterinario/a destino no es válido.')
        .openapi({ example: '33333333-3333-4333-8333-333333333333' }),
    })
    .openapi('CompartirHistorialDto'),
);

export type DatosCompartirHistorialDto = z.infer<typeof CompartirHistorialSchema>;

export interface ComandoCompartirHistorial extends DatosCompartirHistorialDto {
  veterinarioOrigenId: string;
}

export const HistorialCompartidoDtoSchema = registroOpenApi.register(
  'HistorialCompartidoDto',
  z
    .object({
      id: z.string().uuid(),
      mascotaId: z.string().uuid(),
      veterinarioOrigenId: z.string().uuid(),
      veterinarioDestinoId: z.string().uuid(),
      autorizadoEn: z.string(),
      revocadoEn: z.string().nullable(),
    })
    .openapi('HistorialCompartidoDto'),
);

export type HistorialCompartidoDto = z.infer<typeof HistorialCompartidoDtoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/veterinarios/historiales-compartidos',
  tags: ['Veterinarios'],
  summary:
    'Un veterinario comparte el historial clínico de una mascota con otro veterinario (Módulo 6). Detrás de feature flag — ver docs/DECISIONES.md.',
  request: {
    body: { content: { 'application/json': { schema: CompartirHistorialSchema } } },
  },
  responses: {
    201: {
      description: 'Historial compartido.',
      content: { 'application/json': { schema: HistorialCompartidoDtoSchema } },
    },
    400: {
      description: 'Payload inválido (PEA-SIS-005) o intento de compartir con uno mismo (PEA-VETADV-003).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Función deshabilitada por feature flag, o rol no autorizado (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'La mascota o el veterinario destino indicado no existen (PEA-AUTH-009 / PEA-VET-011).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});

const ParametrosHistorialSchema = z.object({ id: z.string().uuid() });

registroOpenApi.registerPath({
  method: 'patch',
  path: '/veterinarios/historiales-compartidos/{id}/revocar',
  tags: ['Veterinarios'],
  summary: 'El veterinario origen revoca un historial compartido activo, preservando el registro para auditoría (Módulo 6).',
  request: { params: ParametrosHistorialSchema },
  responses: {
    200: { description: 'Historial revocado.', content: { 'application/json': { schema: HistorialCompartidoDtoSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Función deshabilitada por feature flag, o quien invoca no es el veterinario origen (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'No hay un historial compartido activo con ese id (PEA-VETADV-006).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
