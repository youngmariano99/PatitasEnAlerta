import { z } from 'zod';
import { registroOpenApi } from '@aplicacion/dtos/openapi-registry';
import { RegistrarDuenoSchema } from '@aplicacion/dtos/auth/RegistrarDuenoDto';

/**
 * Extiende el esquema base de dueño (email + password) con los dos campos
 * obligatorios de la matrícula profesional (AUTH-02). Comparte los
 * validadores de email/password sin duplicarlos — ver
 * PerfilFormularioFactory, que expone este mismo esquema para el rol
 * "veterinario".
 */
export const RegistrarVeterinarioSchema = registroOpenApi.register(
  'RegistrarVeterinarioDto',
  RegistrarDuenoSchema.extend({
    matricula: z
      .string({ required_error: 'Ingresá tu número de matrícula profesional.' })
      .trim()
      .min(1, 'Ingresá tu número de matrícula profesional.')
      .max(50, 'La matrícula no puede superar los 50 caracteres.')
      .openapi({ example: 'MP-1001' }),
    colegioEmisor: z
      .string({ required_error: 'Ingresá el colegio que emitió tu matrícula.' })
      .trim()
      .min(1, 'Ingresá el colegio que emitió tu matrícula.')
      .max(150, 'El nombre del colegio no puede superar los 150 caracteres.')
      .openapi({ example: 'Colegio de Veterinarios de la Provincia de Buenos Aires' }),
  }).openapi('RegistrarVeterinarioDto'),
);

export type RegistrarVeterinarioDto = z.infer<typeof RegistrarVeterinarioSchema>;

export const VeterinarioRegistradoSchema = registroOpenApi.register(
  'VeterinarioRegistrado',
  z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      matricula: z.string(),
      colegioEmisor: z.string(),
      estadoVerificacion: z.string().openapi({ example: 'pendiente' }),
    })
    .openapi('VeterinarioRegistrado'),
);

export type VeterinarioRegistrado = z.infer<typeof VeterinarioRegistradoSchema>;

// Nota: POST /auth/registro es el mismo endpoint físico para dueño y
// veterinario (distinguidos por el campo "rol" del body) — su path ya está
// registrado en RegistrarDuenoDto.ts. No se vuelve a llamar acá
// `registroOpenApi.registerPath` para el mismo path+method (zod-to-openapi
// no soporta bien dos registros para la misma ruta sin componerlos con
// `oneOf`); estos dos esquemas quedan igual documentados como componentes
// reutilizables de /api/openapi para quien integre este endpoint como
// veterinario.
