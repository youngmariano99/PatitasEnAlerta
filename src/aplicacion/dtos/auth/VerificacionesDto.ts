import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

export const VerificacionPendienteSchema = registroOpenApi.register(
  'VerificacionPendiente',
  z
    .object({
      id: z.string().uuid(),
      usuarioId: z.string().uuid(),
      tipo: z.enum(['veterinario', 'municipio']),
      email: z.string().email(),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
      matricula: z.string().nullable(),
      colegioEmisor: z.string().nullable(),
      nombreInstitucional: z.string().nullable(),
    })
    .openapi('VerificacionPendiente'),
);

export const PaginaVerificacionesSchema = registroOpenApi.register(
  'PaginaVerificaciones',
  z
    .object({
      items: z.array(VerificacionPendienteSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(50),
    })
    .openapi('PaginaVerificaciones'),
);

export const ResolverVerificacionBodySchema = registroOpenApi.register(
  'ResolverVerificacionBody',
  z
    .object({
      decision: z.enum(['aprobado', 'rechazado']),
      motivoRechazo: z
        .string()
        .max(500)
        .optional()
        .openapi({ description: 'Obligatorio cuando decision = "rechazado".' }),
    })
    .openapi('ResolverVerificacionBody'),
);

export const VerificacionResueltaSchema = registroOpenApi.register(
  'VerificacionResuelta',
  z
    .object({
      verificacionId: z.string().uuid(),
      usuarioId: z.string().uuid(),
      tipo: z.enum(['veterinario', 'municipio']),
      estado: z.enum(['aprobado', 'rechazado']),
    })
    .openapi('VerificacionResuelta'),
);

registroOpenApi.registerPath({
  method: 'get',
  path: '/admin/verificaciones',
  tags: ['Administración'],
  summary: 'Lista la cola de verificaciones pendientes, paginada (tope 50) — exclusivo de rol administrador.',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(50).optional(),
    }),
  },
  responses: {
    200: { description: 'Página de verificaciones pendientes.', content: { 'application/json': { schema: PaginaVerificacionesSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol administrador (PEA-SIS-002).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

export const FilaHistorialVerificacionSchema = registroOpenApi.register(
  'FilaHistorialVerificacion',
  z
    .object({
      id: z.string().uuid(),
      usuarioId: z.string().uuid(),
      tipo: z.enum(['veterinario', 'municipio']),
      email: z.string().email(),
      estado: z.enum(['aprobado', 'rechazado']),
      motivoRechazo: z.string().nullable(),
      revisadoPor: z.string().uuid().nullable(),
      resueltoEn: z.string().datetime().nullable().openapi({ description: 'ISO 8601' }),
      createdAt: z.string().datetime().openapi({ description: 'ISO 8601' }),
      matricula: z.string().nullable(),
      colegioEmisor: z.string().nullable(),
      nombreInstitucional: z.string().nullable(),
    })
    .openapi('FilaHistorialVerificacion'),
);

export const PaginaHistorialVerificacionesSchema = registroOpenApi.register(
  'PaginaHistorialVerificaciones',
  z
    .object({
      items: z.array(FilaHistorialVerificacionSchema),
      total: z.number().int(),
      pagina: z.number().int(),
      porPagina: z.number().int().max(50),
    })
    .openapi('PaginaHistorialVerificaciones'),
);

registroOpenApi.registerPath({
  method: 'get',
  path: '/admin/auditoria',
  tags: ['Administración'],
  summary:
    'Historial de auditoría — verificaciones ya resueltas (aprobado/rechazado), paginado (tope 50), exclusivo de rol administrador. Vista de solo lectura.',
  request: {
    query: z.object({
      pagina: z.coerce.number().int().min(1).optional(),
      porPagina: z.coerce.number().int().min(1).max(50).optional(),
    }),
  },
  responses: {
    200: { description: 'Página del historial de verificaciones resueltas.', content: { 'application/json': { schema: PaginaHistorialVerificacionesSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol administrador (PEA-SIS-002).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});

registroOpenApi.registerPath({
  method: 'patch',
  path: '/admin/verificaciones/{id}',
  tags: ['Administración'],
  summary: 'Aprueba o rechaza una verificación pendiente — exclusivo de rol administrador.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: ResolverVerificacionBodySchema } } },
  },
  responses: {
    200: { description: 'Verificación resuelta.', content: { 'application/json': { schema: VerificacionResueltaSchema } } },
    400: { description: 'Payload inválido, o falta motivoRechazo al rechazar (PEA-SIS-005).', content: { 'application/json': { schema: ErrorApiSchema } } },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: { description: 'Quien invoca no tiene rol administrador (PEA-SIS-002).', content: { 'application/json': { schema: ErrorApiSchema } } },
    409: { description: 'La verificación ya fue resuelta antes (PEA-AUTH-013).', content: { 'application/json': { schema: ErrorApiSchema } } },
  },
});
