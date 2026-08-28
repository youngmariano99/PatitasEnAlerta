import { z } from 'zod';
import { registroOpenApi } from '@aplicacion/dtos/openapi-registry';
import { RegistrarMascotaSchema } from '@aplicacion/dtos/mascotas/RegistrarMascotaDto';

/**
 * Edición parcial (AUTH-04/AUTH-05): mismos campos y reglas que el alta,
 * todos opcionales — `.partial()` reutiliza los validadores de cada campo
 * (min/max/url) sin duplicarlos. `dueñoId` y `created_at` nunca se editan
 * (no forman parte de este esquema ni del comando del caso de uso).
 */
export const ActualizarMascotaSchema = registroOpenApi.register(
  'ActualizarMascotaDto',
  RegistrarMascotaSchema.partial().openapi('ActualizarMascotaDto'),
);

export type CambiosMascotaDto = z.infer<typeof ActualizarMascotaSchema>;

export interface ComandoActualizarMascota extends CambiosMascotaDto {
  id: string;
  dueñoIdSolicitante: string;
}

export interface ComandoDarDeBajaMascota {
  id: string;
  dueñoIdSolicitante: string;
}

// Nota: este ticket es de capa de aplicación/dominio (casos de uso +
// repositorio) — no incluye los route handlers HTTP (PATCH/DELETE
// /api/mascotas/[id]). Por eso no se registran acá rutas en el documento
// OpenAPI (`registroOpenApi.registerPath`): harían pública una ruta que
// todavía no existe. Se registran cuando se implemente esa capa.
