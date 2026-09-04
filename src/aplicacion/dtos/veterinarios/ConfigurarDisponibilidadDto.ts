import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/** `HH:mm`, 24hs, con ceros a la izquierda — comparable lexicográficamente igual que cronológicamente (mismo criterio que el `CHECK hora_fin > hora_inicio` de docs/SCHEMA.md). */
const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Contrato de entrada de "Configuración de agenda del veterinario" (Módulo
 * 4). Una franja es recurrente por día de la semana (`diaSemana`, 0=domingo
 * .. 6=sábado — mismo criterio que `Date.getUTCDay()`), no una fecha puntual.
 *
 * El `refine` de horarios corre en Zod (capa Aplicación) porque docs/ERRORS.md
 * marca PEA-VET-001 explícitamente así — `ConfigurarDisponibilidad.ts` mapea
 * el primer issue con `path` `horaFin` a ese código concreto en vez de dejarlo
 * caer en el PEA-SIS-005 genérico (mismo criterio que `CrearEventoDto.ts` con
 * PEA-MUN-004).
 *
 * `veterinarioId` NO forma parte de este esquema: siempre se deriva de la
 * sesión autenticada en el route handler, nunca del body del cliente.
 */
export const ConfigurarDisponibilidadSchema = registroOpenApi.register(
  'ConfigurarDisponibilidadDto',
  z
    .object({
      diaSemana: z
        .number({ required_error: 'Elegí el día de la semana para esta franja.' })
        .int('El día de la semana tiene que ser un número entero.')
        .min(0, 'Elegí un día de la semana válido.')
        .max(6, 'Elegí un día de la semana válido.')
        .openapi({ example: 1, description: '0=domingo .. 6=sábado' }),
      horaInicio: z
        .string({ required_error: 'Indicá la hora de inicio de tu atención.' })
        .regex(PATRON_HORA, 'La hora de inicio tiene que tener el formato HH:mm.')
        .openapi({ example: '09:00' }),
      horaFin: z
        .string({ required_error: 'Indicá la hora de fin de tu atención.' })
        .regex(PATRON_HORA, 'La hora de fin tiene que tener el formato HH:mm.')
        .openapi({ example: '13:00' }),
      activo: z.boolean().optional().default(true),
    })
    .refine((datos) => datos.horaFin > datos.horaInicio, {
      message: 'El horario de fin tiene que ser posterior al de inicio.',
      path: ['horaFin'],
    })
    .openapi('ConfigurarDisponibilidadDto'),
);

export type DatosConfigurarDisponibilidadDto = z.infer<typeof ConfigurarDisponibilidadSchema>;

/** Comando interno del caso de uso: los datos del formulario + quién configura, siempre resuelto por la sesión. */
export interface ComandoConfigurarDisponibilidad extends DatosConfigurarDisponibilidadDto {
  veterinarioId: string;
}

export const FranjaDisponibilidadSchema = registroOpenApi.register(
  'FranjaDisponibilidad',
  z
    .object({
      id: z.string().uuid(),
      veterinarioId: z.string().uuid(),
      diaSemana: z.number(),
      horaInicio: z.string(),
      horaFin: z.string(),
      activo: z.boolean(),
      createdAt: z.string(),
    })
    .openapi('FranjaDisponibilidad'),
);

export type FranjaDisponibilidad = z.infer<typeof FranjaDisponibilidadSchema>;

/** Resultado de configurar una franja: la franja persistida + cuántos turnos 'disponible' nuevos generó la sincronización (Motor de Turnera). */
export interface DisponibilidadConfigurada extends FranjaDisponibilidad {
  turnosGenerados: number;
}

registroOpenApi.registerPath({
  method: 'post',
  path: '/veterinarios/disponibilidad',
  tags: ['Veterinarios'],
  summary: 'Configura (crea o actualiza) la franja de agenda propia para un día de la semana — exclusivo de rol veterinario ya verificado.',
  request: {
    body: { content: { 'application/json': { schema: ConfigurarDisponibilidadSchema } } },
  },
  responses: {
    201: {
      description: 'Franja configurada; sincroniza de inmediato los turnos "disponible" de los próximos días (Motor de Turnera).',
      content: { 'application/json': { schema: FranjaDisponibilidadSchema } },
    },
    400: {
      description: 'Payload inválido u horario de fin anterior o igual al de inicio (PEA-SIS-005 / PEA-VET-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol veterinario, o su matrícula todavía no está verificada (PEA-SIS-002 / PEA-VET-007).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
