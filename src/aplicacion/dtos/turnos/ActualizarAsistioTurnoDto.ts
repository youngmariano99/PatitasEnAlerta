import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Contrato de entrada de "marcar asistencia" (Módulo 6, Historia
 * "Recordatorios automáticos de turnos", Paso 2: "tras la franja, permitir
 * actualizar turnos.asistio desde el panel del proveedor"). `proveedorId`
 * NO forma parte de este esquema: siempre se deriva de la sesión
 * autenticada en el route handler, nunca del body del cliente — mismo
 * criterio que `CancelarTurnoDto`.
 */
export const ActualizarAsistioTurnoSchema = registroOpenApi.register(
  'ActualizarAsistioTurnoDto',
  z
    .object({
      turnoId: z.string({ required_error: 'Elegí un turno.' }).uuid('El identificador del turno no es válido.'),
      asistio: z.boolean({ required_error: 'Indicá si la persona asistió o no.' }),
    })
    .openapi('ActualizarAsistioTurnoDto'),
);

export type DatosActualizarAsistioTurnoDto = z.infer<typeof ActualizarAsistioTurnoSchema>;

/** Comando interno del caso de uso: el turno + el valor + quién lo marca, siempre resuelto por la sesión. */
export interface ComandoActualizarAsistioTurno extends DatosActualizarAsistioTurnoDto {
  proveedorId: string;
}

export const TurnoAsistioActualizadoSchema = registroOpenApi.register(
  'TurnoAsistioActualizado',
  z
    .object({
      id: z.string().uuid(),
      asistio: z.boolean(),
    })
    .openapi('TurnoAsistioActualizado'),
);

export type TurnoAsistioActualizadoDto = z.infer<typeof TurnoAsistioActualizadoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/turnos/marcar-asistencia',
  tags: ['Turnos'],
  summary: 'Marca si la persona reservante asistió o no a un turno ya concluido — exclusivo del proveedor de ese turno.',
  request: {
    body: { content: { 'application/json': { schema: ActualizarAsistioTurnoSchema } } },
  },
  responses: {
    200: {
      description: 'Asistencia registrada.',
      content: { 'application/json': { schema: TurnoAsistioActualizadoSchema } },
    },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no es el proveedor del turno (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'El turno no existe, está soft-deleted, o no está "reservado" (PEA-MUN-003).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description: 'La franja del turno todavía no concluyó (PEA-VETADV-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
