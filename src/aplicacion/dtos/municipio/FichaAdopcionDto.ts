import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { opcionalDeTexto } from '@aplicacion/dtos/zod-helpers';
import { ESTADOS_FICHA_ADOPCION_SOPORTADOS } from '@dominio/entidades/FichaAdopcion';

/** Tamaños soportados (docs/SCHEMA.md, CHECK tamano sobre `vitrina_adopcion`). */
export const TAMANOS_FICHA_ADOPCION_SOPORTADOS = ['pequeño', 'mediano', 'grande'] as const;
export type TamanoFichaAdopcion = (typeof TAMANOS_FICHA_ADOPCION_SOPORTADOS)[number];

const TOPE_POR_PAGINA = 50;

/**
 * Contrato de entrada de "Publicar ficha de adopción" (Paso 2 del ticket):
 * `nombreAnimal`, `especie` y `fotoUrl` son los únicos obligatorios — el
 * resto describe al animal pero nunca bloquea la publicación si falta.
 * `municipioId` NO forma parte de este esquema: siempre se deriva de la
 * sesión autenticada en el route handler, nunca del body del cliente (mismo
 * criterio que CrearEventoDto).
 */
export const PublicarFichaAdopcionSchema = registroOpenApi.register(
  'PublicarFichaAdopcionDto',
  z
    .object({
      nombreAnimal: z
        .string({ required_error: 'Ponele un nombre al animal.' })
        .trim()
        .min(1, 'Ponele un nombre al animal.')
        .max(80, 'El nombre no puede superar los 80 caracteres.'),
      especie: z
        .string({ required_error: 'Contanos qué especie es.' })
        .trim()
        .min(1, 'Contanos qué especie es.')
        .max(40, 'La especie no puede superar los 40 caracteres.')
        .openapi({ example: 'perro' }),
      fotoUrl: z
        .string({ required_error: 'Necesitamos una foto del animal para publicar la ficha.' })
        .url('La URL de la foto no es válida.')
        .openapi({ example: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/luna.jpg' }),
      edadAproximada: z
        .number({ invalid_type_error: 'La edad tiene que ser un número.' })
        .int('La edad tiene que ser un número entero.')
        .min(0, 'La edad no puede ser negativa.')
        .optional(),
      tamano: z
        .enum(TAMANOS_FICHA_ADOPCION_SOPORTADOS, { invalid_type_error: 'Elegí un tamaño válido.' })
        .optional(),
      temperamento: opcionalDeTexto(200).openapi({ example: 'Sociable, tranquilo con otros animales.' }),
      estadoSalud: opcionalDeTexto(200).openapi({ example: 'Castrado, vacunas al día.' }),
      requisitosAdopcion: opcionalDeTexto(500).openapi({ example: 'Vivienda con patio, visita previa obligatoria.' }),
    })
    .openapi('PublicarFichaAdopcionDto'),
);

export type DatosPublicarFichaAdopcionDto = z.infer<typeof PublicarFichaAdopcionSchema>;

/** Comando interno: los datos del formulario + quién publica, siempre resuelto por la sesión. */
export interface ComandoPublicarFichaAdopcion extends DatosPublicarFichaAdopcionDto {
  municipioId: string;
}

/**
 * Edición parcial: mismos campos y reglas que la publicación, todos
 * opcionales — `.partial()` reutiliza cada validador sin duplicarlo.
 * `estado` deliberadamente ausente: se cambia únicamente vía
 * DarDeBajaFichaAdopcion, nunca con un PATCH genérico de cualquier campo.
 */
export const ActualizarFichaAdopcionSchema = registroOpenApi.register(
  'ActualizarFichaAdopcionDto',
  PublicarFichaAdopcionSchema.partial().openapi('ActualizarFichaAdopcionDto'),
);

export type CambiosFichaAdopcionDto = z.infer<typeof ActualizarFichaAdopcionSchema>;

export interface ComandoActualizarFichaAdopcion extends CambiosFichaAdopcionDto {
  id: string;
  municipioId: string;
}

export interface ComandoDarDeBajaFichaAdopcion {
  id: string;
  municipioId: string;
}

export const FichaAdopcionSchema = registroOpenApi.register(
  'FichaAdopcion',
  z
    .object({
      id: z.string().uuid(),
      municipioId: z.string().uuid(),
      nombreAnimal: z.string(),
      especie: z.string(),
      edadAproximada: z.number().nullable(),
      tamano: z.string().nullable(),
      temperamento: z.string().nullable(),
      estadoSalud: z.string().nullable(),
      requisitosAdopcion: z.string().nullable(),
      fotoUrl: z.string(),
      estado: z.string(),
      createdAt: z.string(),
    })
    .openapi('FichaAdopcion'),
);

export type FichaAdopcionDto = z.infer<typeof FichaAdopcionSchema>;

/** Query params del panel municipal (GET /municipio/adopciones) — a diferencia de la vitrina pública, ve TODOS los estados. */
export const ListarFichasAdopcionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
  estado: z.enum(ESTADOS_FICHA_ADOPCION_SOPORTADOS).optional().catch(undefined),
});

export type ParametrosListarFichasAdopcion = z.infer<typeof ListarFichasAdopcionQuerySchema>;

export const PaginaFichasAdopcionSchema = registroOpenApi.register(
  'PaginaFichasAdopcion',
  z
    .object({
      items: z.array(FichaAdopcionSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaFichasAdopcion'),
);

/** Query params de la vitrina pública (GET /adopciones) — a diferencia del panel municipal, no admite filtro por `estado`: siempre 'disponible'. */
export const ListarVitrinaAdopcionPublicoQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});

export type ParametrosListarVitrinaAdopcionPublico = z.infer<typeof ListarVitrinaAdopcionPublicoQuerySchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/adopciones',
  tags: ['Adopciones'],
  summary:
    'Vitrina pública y paginada (tope 50) de fichas en estado "disponible" — sin autenticación (GRANT SELECT a anon, RLS vitrina_select_publico).',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Página de fichas disponibles, ordenadas por fecha de publicación descendente.',
      content: { 'application/json': { schema: PaginaFichasAdopcionSchema } },
    },
  },
});

registroOpenApi.registerPath({
  method: 'post',
  path: '/municipio/adopciones',
  tags: ['Municipio'],
  summary: 'Publica una ficha en la vitrina de adopción — exclusivo de rol municipio o administrador.',
  request: { body: { content: { 'application/json': { schema: PublicarFichaAdopcionSchema } } } },
  responses: {
    201: { description: 'Ficha publicada, estado inicial "disponible".', content: { 'application/json': { schema: FichaAdopcionSchema } } },
    400: { description: 'Falta nombre_animal, especie o foto_url (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol municipio/administrador (PEA-MUN-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'get',
  path: '/municipio/adopciones',
  tags: ['Municipio'],
  summary: 'Panel municipal: listado paginado de TODAS las fichas propias (cualquier estado) — exclusivo de rol municipio o administrador.',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
      estado: z.enum(ESTADOS_FICHA_ADOPCION_SOPORTADOS).optional(),
    }),
  },
  responses: {
    200: { description: 'Página de fichas propias.', content: { 'application/json': { schema: PaginaFichasAdopcionSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol municipio/administrador (PEA-MUN-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'patch',
  path: '/municipio/adopciones/{id}',
  tags: ['Municipio'],
  summary: 'Edita parcialmente una ficha de adopción — exclusivo de rol municipio o administrador.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: ActualizarFichaAdopcionSchema } } },
  },
  responses: {
    200: { description: 'Ficha actualizada.', content: { 'application/json': { schema: FichaAdopcionSchema } } },
    400: { description: 'Payload inválido (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol municipio/administrador (PEA-MUN-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    404: { description: 'No existe esa ficha (PEA-MUN-008).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'delete',
  path: '/municipio/adopciones/{id}',
  tags: ['Municipio'],
  summary: 'Da de baja una ficha (soft — estado="baja", nunca DELETE físico) — exclusivo de rol municipio o administrador.',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: 'Ficha dada de baja.', content: { 'application/json': { schema: FichaAdopcionSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol municipio/administrador (PEA-MUN-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    404: { description: 'No existe esa ficha (PEA-MUN-008).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
