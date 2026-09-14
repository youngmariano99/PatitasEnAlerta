import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/**
 * Comando interno de "Ofrecerse como colaborador/a" (Historia de la Red de
 * Colaboración, docs/REQUISITOS.md Módulo 5 — Post-MVP): no hay body de
 * cliente — `solicitudId` viene de la ruta y `stakeholderId` siempre se
 * deriva de la sesión autenticada (mismo criterio que `organizacionId` en
 * PublicarSolicitudRecursoDto.ts), nunca de un payload. Este schema solo
 * valida el shape ya ensamblado por el route handler (fail-fast también
 * sobre esos dos valores, no únicamente sobre lo que manda el cliente).
 */
export const OfrecerseComoColaboradorComandoSchema = z.object({
  solicitudId: z.string().uuid('El identificador de la solicitud no es válido.'),
  stakeholderId: z.string().uuid(),
});

export type ComandoOfrecerseComoColaborador = z.infer<typeof OfrecerseComoColaboradorComandoSchema>;

export const ColaboracionPropuestaSchema = registroOpenApi.register(
  'ColaboracionPropuesta',
  z
    .object({
      id: z.string().uuid(),
      solicitudId: z.string().uuid(),
      stakeholderId: z.string().uuid(),
      estado: z.string().openapi({ example: 'propuesta' }),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('ColaboracionPropuesta'),
);

export type ColaboracionPropuestaDto = z.infer<typeof ColaboracionPropuestaSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/red-colaboracion/solicitudes/{id}/colaboraciones',
  tags: ['Red de Colaboración'],
  summary: 'Se ofrece como colaborador/a sobre una solicitud abierta — exclusivo de rescatista/veterinario.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    201: {
      description: 'Colaboración creada con estado inicial "propuesta"; se notifica a la organización dueña.',
      content: { 'application/json': { schema: ColaboracionPropuestaSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol rescatista ni veterinario (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'No existe esa solicitud o ya no está disponible (PEA-RED-003).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    409: {
      description:
        'La solicitud ya fue cubierta (PEA-RED-001) o quien invoca ya se había ofrecido antes sobre esta misma solicitud (PEA-RED-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
