import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada de la reserva de un turno (Módulo 3). `reservadoPor`
 * NO forma parte de este esquema: igual que `reportadoPor` en
 * CrearReporteDto, siempre se deriva de la sesión autenticada en el route
 * handler (ver app/api/turnos/reservar/route.ts), nunca del body del
 * cliente.
 */
export const ReservarTurnoSchema = registroOpenApi.register(
  'ReservarTurnoDto',
  z
    .object({
      turnoId: z.string({ required_error: 'Elegí un turno para reservar.' }).uuid('El identificador del turno no es válido.'),
    })
    .openapi('ReservarTurnoDto'),
);

export type DatosReservarTurnoDto = z.infer<typeof ReservarTurnoSchema>;

/** Comando interno del caso de uso: el turno elegido + quién reserva, siempre resuelto por la sesión. */
export interface ComandoReservarTurno extends DatosReservarTurnoDto {
  reservadoPor: string;
}

export const TurnoReservadoSchema = registroOpenApi.register(
  'TurnoReservado',
  z
    .object({
      id: z.string().uuid(),
      estado: z.string(),
      reservadoPor: z.string().uuid(),
      version: z.number().int(),
    })
    .openapi('TurnoReservado'),
);

export type TurnoReservadoDto = z.infer<typeof TurnoReservadoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/turnos/reservar',
  tags: ['Turnos'],
  summary: 'Reserva un turno "disponible" para el usuario autenticado — control optimista de concurrencia (anti doble-reserva).',
  request: {
    body: { content: { 'application/json': { schema: ReservarTurnoSchema } } },
  },
  responses: {
    200: {
      description: 'Turno reservado — estado, version y reservado_por actualizados.',
      content: { 'application/json': { schema: TurnoReservadoSchema } },
    },
    400: {
      description: 'Payload inválido (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    404: {
      description: 'El turno no existe o está soft-deleted (PEA-MUN-003).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description:
        'El turno ya no está "disponible" — otra request ganó la carrera entre la lectura y el UPDATE condicionado (PEA-MUN-001). El cliente debe refrescar la lista de turnos disponibles.',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
