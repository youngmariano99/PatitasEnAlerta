import { z } from 'zod';
import { registroOpenApi } from '@aplicacion/dtos/openapi-registry';
import { RegistrarDuenoSchema } from '@aplicacion/dtos/auth/RegistrarDuenoDto';

/**
 * Rescatista/Activista (docs/ROLES.md, Módulo 5 — Post-MVP): autoregistro sin
 * perfil adicional y sin verificación profesional (matrícula, colegio
 * emisor, etc.) — mismo shape que RegistrarDuenoSchema (email + password).
 * `.extend({})` genera una instancia de esquema propia y distinguible de la
 * de dueño (Abstract Factory: PerfilFormularioFactory.crear('rescatista')
 * tiene que devolver un producto distinto al de 'dueño'), sin duplicar la
 * definición de los campos ni sus validadores.
 */
export const RegistrarRescatistaSchema = registroOpenApi.register(
  'RegistrarRescatistaDto',
  RegistrarDuenoSchema.extend({}).openapi('RegistrarRescatistaDto'),
);

export type RegistrarRescatistaDto = z.infer<typeof RegistrarRescatistaSchema>;

// Nota: igual que RegistrarVeterinarioDto.ts, no se vuelve a registrar el
// path POST /auth/registro acá (ya documentado en RegistrarDuenoDto.ts) —
// zod-to-openapi no compone bien dos schemas de body para la misma ruta sin
// `oneOf`. Este esquema queda documentado como componente reutilizable.
