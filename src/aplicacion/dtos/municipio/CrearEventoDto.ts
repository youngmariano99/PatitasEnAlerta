import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { opcionalDeTexto } from '@aplicacion/dtos/zod-helpers';

/** Tipos de operativo soportados (docs/SCHEMA.md, CHECK tipo sobre `eventos`). */
export const TIPOS_EVENTO_SOPORTADOS = ['castracion', 'vacunacion', 'desparasitacion', 'otro'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO_SOPORTADOS)[number];

/**
 * Contrato de entrada del alta rápida de un operativo municipal (Módulo 3).
 * `fecha` se valida acá mismo (Zod, `refine`) como posterior al instante
 * actual — docs/ERRORS.md marca PEA-MUN-004 explícitamente como "Capa:
 * Aplicación (Zod)", así que CrearEvento.ts mapea el primer issue de un
 * `ZodError` cuyo `path` sea `fecha` a ese código concreto en vez de dejarlo
 * caer en el genérico PEA-SIS-005 (mismo criterio que
 * `ValidadorEsquemaZod.aErrorDeNegocio` en ValidacionReporte.ts).
 *
 * `cuposTotales` exige entero positivo acá — Paso 4 del ticket pide además
 * que el mismo criterio exista como `CHECK (cupos_totales > 0)` en BD
 * (docs/SCHEMA.md), ya vigente desde el modelado inicial de `eventos`: este
 * esquema es la primera línea de defensa, nunca la única.
 *
 * `municipioId` NO forma parte de este esquema: igual que `reportadoPor` en
 * CrearReporteDto, siempre se deriva de la sesión autenticada en el route
 * handler (ver app/api/municipio/eventos/route.ts), nunca del body del cliente.
 */
export const CrearEventoSchema = registroOpenApi.register(
  'CrearEventoDto',
  z
    .object({
      titulo: z
        .string({ required_error: 'Ponele un título al operativo.' })
        .trim()
        .min(1, 'Ponele un título al operativo.')
        .max(150, 'El título no puede superar los 150 caracteres.'),
      tipo: z.enum(TIPOS_EVENTO_SOPORTADOS, {
        required_error: 'Elegí un tipo de operativo válido.',
        invalid_type_error: 'Elegí un tipo de operativo válido.',
      }),
      direccion: z
        .string({ required_error: 'Indicá la dirección donde se realiza el operativo.' })
        .trim()
        .min(1, 'Indicá la dirección donde se realiza el operativo.')
        .max(200, 'La dirección no puede superar los 200 caracteres.'),
      latitud: z
        .number({ required_error: 'Marcá la ubicación del operativo en el mapa.' })
        .finite('Marcá la ubicación del operativo en el mapa.'),
      longitud: z
        .number({ required_error: 'Marcá la ubicación del operativo en el mapa.' })
        .finite('Marcá la ubicación del operativo en el mapa.'),
      fecha: z.coerce
        .date({
          required_error: 'Elegí la fecha del operativo.',
          invalid_type_error: 'La fecha del operativo no tiene un formato válido.',
        })
        .refine((fecha) => fecha.getTime() > Date.now(), 'La fecha del evento tiene que ser posterior a hoy.'),
      cuposTotales: z
        .number({ required_error: 'Indicá cuántos cupos tiene el operativo.' })
        .int('Los cupos tienen que ser un número entero.')
        .positive('Los cupos tienen que ser mayores a 0.'),
      requisitos: opcionalDeTexto(500).openapi({ example: 'Traer a la mascota con collar/bozal y DNI del tutor.' }),
    })
    .openapi('CrearEventoDto'),
);

export type DatosCrearEventoDto = z.infer<typeof CrearEventoSchema>;

/** Comando interno del caso de uso: los datos del formulario + quién lo publica, siempre resuelto por la sesión. */
export interface ComandoCrearEvento extends DatosCrearEventoDto {
  municipioId: string;
}

export const EventoCreadoSchema = registroOpenApi.register(
  'EventoCreado',
  z
    .object({
      id: z.string().uuid(),
      municipioId: z.string().uuid(),
      titulo: z.string(),
      tipo: z.string(),
      direccion: z.string(),
      latitud: z.number(),
      longitud: z.number(),
      fecha: z.string(),
      cuposTotales: z.number(),
      requisitos: z.string().nullable(),
      createdAt: z.string(),
    })
    .openapi('EventoCreado'),
);

export type EventoCreado = z.infer<typeof EventoCreadoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/municipio/eventos',
  tags: ['Municipio'],
  summary: 'Alta rápida de un operativo municipal — exclusivo de rol municipio o administrador.',
  request: {
    body: { content: { 'application/json': { schema: CrearEventoSchema } } },
  },
  responses: {
    201: {
      description: 'Operativo creado, disponible de inmediato en el calendario público (RLS `eventos_select_publico`).',
      content: { 'application/json': { schema: EventoCreadoSchema } },
    },
    400: {
      description: 'Payload inválido o fecha anterior a hoy (PEA-SIS-005 / PEA-MUN-004).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol municipio/administrador (PEA-MUN-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
