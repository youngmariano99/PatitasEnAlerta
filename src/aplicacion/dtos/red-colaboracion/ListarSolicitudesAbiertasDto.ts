import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';
import { PaginaSolicitudesVeterinariasSchema } from '@aplicacion/dtos/red-colaboracion/ListarSolicitudesVeterinariasDto';

const TOPE_POR_PAGINA = 50;

export const ListarSolicitudesAbiertasQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});

export type ParametrosListarSolicitudesAbiertas = z.infer<
  typeof ListarSolicitudesAbiertasQuerySchema
>;

registroOpenApi.registerPath({
  method: 'get',
  path: '/red-colaboracion/solicitudes',
  tags: ['Red de Colaboración'],
  summary:
    'Todas las solicitudes de recurso abiertas (cualquier tipo), paginadas — para que rescatistas/veterinarios naveguen el listado completo y se ofrezcan como colaboradores.',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Página de solicitudes abiertas.',
      content: { 'application/json': { schema: PaginaSolicitudesVeterinariasSchema } },
    },
    401: {
      description: 'No hay sesión activa (PEA-SIS-001).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
