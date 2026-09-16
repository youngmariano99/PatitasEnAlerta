import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { METODOS_COMPATIBILIDAD_SOPORTADOS } from '@dominio/estrategias/EstrategiaCompatibilidad';

export const SugerenciaCompatibilidadDtoSchema = registroOpenApi.register(
  'SugerenciaCompatibilidadDto',
  z
    .object({
      id: z.string().uuid(),
      vitrinaAdopcionId: z.string().uuid(),
      scoreCompatibilidad: z.number().min(0).max(1),
      metodo: z.enum(METODOS_COMPATIBILIDAD_SOPORTADOS),
    })
    .openapi('SugerenciaCompatibilidadDto'),
);
export type SugerenciaCompatibilidadDto = z.infer<typeof SugerenciaCompatibilidadDtoSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/adopcion-compatibilidad/sugerencias',
  tags: ['Adopción y Compatibilidad'],
  summary:
    'Genera sugerencias de compatibilidad entre el cuestionario propio y las fichas de adopción disponibles (Módulo 9, Paso 2). Estrategia intercambiable por configuración (Paso 3).',
  responses: {
    201: {
      description: 'Sugerencias generadas — una por cada ficha "disponible" candidata.',
      content: { 'application/json': { schema: z.array(SugerenciaCompatibilidadDtoSchema) } },
    },
    400: {
      description: 'El cuestionario propio está incompleto (PEA-ADOP-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    404: {
      description: 'Todavía no completaste ningún cuestionario (PEA-ADOP-003).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
