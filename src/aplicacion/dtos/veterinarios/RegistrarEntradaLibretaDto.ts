import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { TIPOS_ENTRADA_LIBRETA } from '@dominio/puertos/IRepositorioEntradasLibreta';

/** `AAAA-MM-DD` — la columna `fecha` es `DATE`, sin componente de hora. */
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Contrato de entrada de "Registro de entrada en la libreta sanitaria"
 * (Módulo 4, Historia VET-03). El `tipo` usa el mismo enum que el `CHECK` de
 * `entradas_libreta_sanitaria` (docs/SCHEMA.md) — un valor fuera de esa lista
 * mapea a PEA-VET-006 en `RegistrarEntradaLibreta.ts`, no al PEA-SIS-005
 * genérico (mismo criterio que `ConfigurarDisponibilidadDto.ts` con
 * PEA-VET-001).
 *
 * `mascotaId` SÍ viaja en el body (a diferencia de `veterinarioId`, que
 * siempre se deriva de la sesión autenticada en el route handler): es la
 * mascota que el veterinario está atendiendo, no puede inferirse de quién
 * hace la request. La legitimidad de escribir en esa mascota puntual la
 * decide `RegistrarEntradaLibreta.autorizar()` contra
 * `autorizaciones_libreta`, nunca este esquema.
 */
export const RegistrarEntradaLibretaSchema = registroOpenApi.register(
  'RegistrarEntradaLibretaDto',
  z
    .object({
      mascotaId: z
        .string({ required_error: 'Indicá la mascota para registrar esta entrada.' })
        .uuid('El id de la mascota no es válido.')
        .openapi({ example: '11111111-1111-4111-8111-111111111111' }),
      tipo: z
        .enum(TIPOS_ENTRADA_LIBRETA, {
          errorMap: () => ({ message: 'Elegí un tipo de entrada válido (vacuna, visita u observación).' }),
        })
        .openapi({ example: 'vacuna' }),
      descripcion: z
        .string({ required_error: 'Describí brevemente esta entrada de la libreta sanitaria.' })
        .trim()
        .min(1, 'Describí brevemente esta entrada de la libreta sanitaria.')
        .max(1000, 'La descripción es demasiado larga (máximo 1000 caracteres).')
        .openapi({ example: 'Vacuna antirrábica aplicada, sin reacciones adversas.' }),
      fecha: z
        .string({ required_error: 'Indicá la fecha de esta entrada.' })
        .regex(PATRON_FECHA, 'La fecha tiene que tener el formato AAAA-MM-DD.')
        .openapi({ example: '2026-09-08' }),
    })
    .openapi('RegistrarEntradaLibretaDto'),
);

export type DatosRegistrarEntradaLibretaDto = z.infer<typeof RegistrarEntradaLibretaSchema>;

/** Comando interno del caso de uso: los datos del formulario + quién registra, siempre resuelto por la sesión. */
export interface ComandoRegistrarEntradaLibreta extends DatosRegistrarEntradaLibretaDto {
  veterinarioId: string;
}

export const EntradaLibretaRegistradaSchema = registroOpenApi.register(
  'EntradaLibretaRegistrada',
  z
    .object({
      id: z.string().uuid(),
      mascotaId: z.string().uuid(),
      veterinarioId: z.string().uuid(),
      tipo: z.enum(TIPOS_ENTRADA_LIBRETA),
      descripcion: z.string(),
      fecha: z.string(),
      createdAt: z.string(),
    })
    .openapi('EntradaLibretaRegistrada'),
);

export type EntradaLibretaRegistrada = z.infer<typeof EntradaLibretaRegistradaSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/veterinarios/libreta',
  tags: ['Veterinarios'],
  summary:
    'Registra una entrada (vacuna, visita u observación) en la libreta sanitaria de una mascota — exclusivo de veterinario verificado con autorización activa del dueño sobre esa mascota puntual.',
  request: {
    body: { content: { 'application/json': { schema: RegistrarEntradaLibretaSchema } } },
  },
  responses: {
    201: {
      description: 'Entrada registrada en la libreta sanitaria.',
      content: { 'application/json': { schema: EntradaLibretaRegistradaSchema } },
    },
    400: {
      description: 'Payload inválido o tipo de entrada no soportado (PEA-SIS-005 / PEA-VET-006).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description:
        'Quien invoca no tiene rol veterinario, su matrícula no está verificada, nunca tuvo autorización del dueño, o esa autorización fue revocada (PEA-SIS-002 / PEA-VET-007 / PEA-VET-003 / PEA-VET-004).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'La mascota indicada no existe o ya no está disponible (PEA-VET-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
