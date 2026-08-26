import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Debe ejecutarse una única vez, antes de que cualquier DTO use `.openapi()`.
extendZodWithOpenApi(z);

/**
 * Registro único (Singleton) de esquemas y rutas documentadas para la
 * especificación OpenAPI del proyecto (NFR Calidad: 100% de endpoints
 * documentados vía zod-to-openapi). Cada DTO se registra acá al importarse;
 * ver src/aplicacion/dtos/auth/RegistrarDuenoDto.ts para el primer ejemplo.
 */
export const registroOpenApi = new OpenAPIRegistry();

export const ErrorApiSchema = registroOpenApi.register(
  'ErrorApi',
  z
    .object({
      codigo: z.string().openapi({ example: 'PEA-AUTH-001' }),
      mensaje: z.string().openapi({ example: 'Ya existe una cuenta con ese email.' }),
    })
    .openapi('ErrorApi'),
);

export function generarDocumentoOpenApi() {
  const generador = new OpenApiGeneratorV3(registroOpenApi.definitions);
  return generador.generateDocument({
    openapi: '3.0.0',
    info: { title: 'Patitas en Alerta API', version: '0.1.0' },
    servers: [{ url: '/api' }],
  });
}
