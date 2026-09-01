import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { TurnoCanceladoSchema } from '@aplicacion/dtos/turnos/CancelarTurnoDto';
import { TurnoReservadoSchema } from '@aplicacion/dtos/turnos/ReservarTurnoDto';

/**
 * Reprogramar = cancelar `turnoActualId` + reservar `turnoNuevoId`, ambos
 * dentro de una única transacción Prisma (Paso 2 del ticket "Cancelación o
 * reprogramación de turno propio") — nunca dos requests separadas: si la
 * reserva del turno nuevo falla, el turno actual JAMÁS queda cancelado sin
 * reemplazo. `usuarioId` NO forma parte de este esquema: siempre se deriva
 * de la sesión autenticada, nunca del body del cliente.
 */
export const ReprogramarTurnoSchema = registroOpenApi.register(
  'ReprogramarTurnoDto',
  z
    .object({
      turnoActualId: z
        .string({ required_error: 'Indicá qué turno querés reprogramar.' })
        .uuid('El identificador del turno actual no es válido.'),
      turnoNuevoId: z
        .string({ required_error: 'Elegí el nuevo horario.' })
        .uuid('El identificador del nuevo turno no es válido.'),
    })
    .refine((datos) => datos.turnoActualId !== datos.turnoNuevoId, {
      message: 'El nuevo horario tiene que ser distinto al que ya tenías reservado.',
      path: ['turnoNuevoId'],
    })
    .openapi('ReprogramarTurnoDto'),
);

export type DatosReprogramarTurnoDto = z.infer<typeof ReprogramarTurnoSchema>;

export interface ComandoReprogramarTurno extends DatosReprogramarTurnoDto {
  usuarioId: string;
}

export const TurnoReprogramadoSchema = registroOpenApi.register(
  'TurnoReprogramado',
  z
    .object({
      turnoCancelado: TurnoCanceladoSchema,
      turnoReservado: TurnoReservadoSchema,
    })
    .openapi('TurnoReprogramado'),
);

export type TurnoReprogramadoDto = z.infer<typeof TurnoReprogramadoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/turnos/reprogramar',
  tags: ['Turnos'],
  summary:
    'Reprograma un turno propio: cancela el actual y reserva uno nuevo dentro de la misma transacción Prisma (todo o nada).',
  request: {
    body: { content: { 'application/json': { schema: ReprogramarTurnoSchema } } },
  },
  responses: {
    200: {
      description: 'Turno actual cancelado y turno nuevo reservado.',
      content: { 'application/json': { schema: TurnoReprogramadoSchema } },
    },
    400: {
      description: 'Payload inválido, o el turno nuevo es el mismo que el actual (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es el reservante del turno actual (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'El turno actual o el nuevo no existen, o ya no están en un estado válido para la operación (PEA-MUN-003).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description: 'El turno nuevo ya fue reservado por otra persona (PEA-MUN-001) — la transacción completa se revierte.',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
