import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

const TOPE_POR_PAGINA = 50;

/**
 * Query params de GET /comercios/cercanos (Módulo 7, Historia "Visibilidad
 * geolocalizada frente a dueños de mascotas" / "Búsqueda de comercios y
 * servicios cercanos"). `zona` es todo-o-nada (mismo criterio y mensaje que
 * `ListarSolicitudesVeterinariasDto.ts` / `ListarDirectorioAliadosDto.ts`):
 * si se declara alguno de `latitud`/`longitud`/`radioKm` hay que declarar
 * los tres. Sin zona, el listado devuelve todos los comercios verificados
 * ordenados por `createdAt` (mismo fallback que `ListarProductosActivos`);
 * con zona, el Paso 1 filtra por bounding box y el Paso 3 ordena por
 * distancia aproximada, calculada en la capa de aplicación (ver
 * `ListarComerciosCercanos.ts`). `q` (texto libre) es independiente de la
 * zona: filtra por `nombre_comercio`/`tipo_comercio` vía Prisma
 * parametrizado (`IRepositorioComercios.listarVerificados`), sin exigir
 * ubicación de referencia.
 */
export const ListarComerciosCercanosQuerySchema = z
  .object({
    pagina: z.coerce.number().int().min(1).catch(1),
    porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
    latitud: z.coerce.number().finite().optional(),
    longitud: z.coerce.number().finite().optional(),
    radioKm: z.coerce.number().positive().optional(),
    q: z
      .string()
      .trim()
      .min(1)
      .max(150, 'La búsqueda no puede superar los 150 caracteres.')
      .optional(),
  })
  .superRefine((datos, ctx) => {
    const campos = [datos.latitud, datos.longitud, datos.radioKm];
    const cantidadDeclarada = campos.filter((valor) => valor !== undefined).length;
    if (cantidadDeclarada > 0 && cantidadDeclarada < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['zona'],
        message: 'Para filtrar por proximidad, indicá latitud, longitud y radioKm juntos.',
      });
    }
  });

export type ComandoListarComerciosCercanos = z.infer<typeof ListarComerciosCercanosQuerySchema>;

export const ComercioCercanoSchema = registroOpenApi.register(
  'ComercioCercano',
  z
    .object({
      id: z.string().uuid(),
      nombreComercio: z.string(),
      tipoComercio: z.string(),
      direccion: z.string(),
      latitud: z.number(),
      longitud: z.number(),
      distanciaKm: z.number().nullable().openapi({ description: 'null si la consulta no incluyó una ubicación de referencia.' }),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
    })
    .openapi('ComercioCercano'),
);
export type ComercioCercanoDto = z.infer<typeof ComercioCercanoSchema>;

export const PaginaComerciosCercanosSchema = registroOpenApi.register(
  'PaginaComerciosCercanos',
  z
    .object({
      items: z.array(ComercioCercanoSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(TOPE_POR_PAGINA),
    })
    .openapi('PaginaComerciosCercanos'),
);
export type PaginaComerciosCercanosDto = z.infer<typeof PaginaComerciosCercanosSchema>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/comercios/cercanos',
  tags: ['Comercios'],
  summary:
    'Catálogo público de comercios verificados (Módulo 7), paginado (tope 50) y ordenado por distancia aproximada cuando se indica una ubicación de referencia.',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
      latitud: z.coerce.number().optional(),
      longitud: z.coerce.number().optional(),
      radioKm: z.coerce.number().optional().openapi({ description: 'Requiere latitud y longitud también.' }),
      q: z.string().optional().openapi({ description: 'Texto libre sobre nombre_comercio/tipo_comercio.' }),
    }),
  },
  responses: {
    200: {
      description: 'Página de comercios con estado_verificacion="verificado" que cumplen los filtros aplicados.',
      content: { 'application/json': { schema: PaginaComerciosCercanosSchema } },
    },
    400: {
      description: 'Filtro de proximidad incompleto (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
