import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada de la cancelación de un turno (Módulo 3). `usuarioId`
 * NO forma parte de este esquema: siempre se deriva de la sesión
 * autenticada en el route handler (ver app/api/turnos/cancelar/route.ts),
 * nunca del body del cliente — mismo criterio que ReservarTurnoDto.
 */
export const CancelarTurnoSchema = registroOpenApi.register(
  'CancelarTurnoDto',
  z
    .object({
      turnoId: z.string({ required_error: 'Elegí un turno para cancelar.' }).uuid('El identificador del turno no es válido.'),
    })
    .openapi('CancelarTurnoDto'),
);

export type DatosCancelarTurnoDto = z.infer<typeof CancelarTurnoSchema>;

/** Comando interno del caso de uso: el turno elegido + quién cancela, siempre resuelto por la sesión. */
export interface ComandoCancelarTurno extends DatosCancelarTurnoDto {
  usuarioId: string;
}

export const TurnoCanceladoSchema = registroOpenApi.register(
  'TurnoCancelado',
  z
    .object({
      id: z.string().uuid(),
      estado: z.string(),
      reservadoPor: z.string().uuid().nullable(),
      version: z.number().int(),
    })
    .openapi('TurnoCancelado'),
);

export type TurnoCanceladoDto = z.infer<typeof TurnoCanceladoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/turnos/cancelar',
  tags: ['Turnos'],
  summary:
    'Cancela un turno "reservado" propio (o del proveedor) — control optimista de concurrencia, libera el cupo de quien lo tenía.',
  request: {
    body: { content: { 'application/json': { schema: CancelarTurnoSchema } } },
  },
  responses: {
    200: {
      description: 'Turno cancelado — estado="cancelado", version incrementada.',
      content: { 'application/json': { schema: TurnoCanceladoSchema } },
    },
    400: {
      description: 'Payload inválido (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es el reservante ni el proveedor del turno (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'El turno no existe, está soft-deleted, o ya no está "reservado" (PEA-MUN-003).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
