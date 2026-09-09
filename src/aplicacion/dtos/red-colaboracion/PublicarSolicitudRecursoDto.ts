import { z } from 'zod';
import { registroOpenApi, ErrorApiSchema } from '@aplicacion/dtos/openapi-registry';

/** Tipos de recurso soportados (docs/SCHEMA.md, CHECK tipo sobre `solicitudes_recurso`). */
export const TIPOS_SOLICITUD_RECURSO_SOPORTADOS = ['transito', 'insumos', 'asistencia_veterinaria', 'adopcion'] as const;
export type TipoSolicitudRecurso = (typeof TIPOS_SOLICITUD_RECURSO_SOPORTADOS)[number];

/**
 * Contrato de entrada de "Publicar solicitudes de recurso" (Historia de la
 * Organización/Refugio, docs/REQUISITOS.md Módulo 5 — Post-MVP): tránsito
 * temporal, insumos, asistencia veterinaria o adopción gestionada por la
 * organización.
 *
 * `reporteId` es opcional: una solicitud puede originarse a partir de un
 * reporte comunitario existente (Módulo 2, ej. una problemática urbana que
 * termina requiriendo tránsito) o publicarse de forma independiente. Igual
 * que `mascotaId` en CrearReporteDto, no se valida su existencia acá — la
 * FK de `solicitudes_recurso.reporte_id` (docs/SCHEMA.md) es la última línea
 * de defensa ante un id inexistente.
 *
 * `organizacionId` NO forma parte de este esquema: siempre se deriva de la
 * sesión autenticada en el route handler (ver
 * app/api/red-colaboracion/solicitudes/route.ts), nunca del body del
 * cliente — mismo criterio que `municipioId` en CrearEventoDto.
 */
export const PublicarSolicitudRecursoSchema = registroOpenApi.register(
  'PublicarSolicitudRecursoDto',
  z
    .object({
      tipo: z.enum(TIPOS_SOLICITUD_RECURSO_SOPORTADOS, {
        required_error: 'Elegí qué tipo de recurso necesitás.',
        invalid_type_error: 'Elegí qué tipo de recurso necesitás.',
      }),
      descripcion: z
        .string({ required_error: 'Contanos brevemente qué necesitás.' })
        .trim()
        .min(1, 'Contanos brevemente qué necesitás.')
        .max(1000, 'La descripción no puede superar los 1000 caracteres.'),
      reporteId: z.string().uuid('El identificador del reporte no es válido.').optional(),
    })
    .openapi('PublicarSolicitudRecursoDto'),
);

export type DatosPublicarSolicitudRecursoDto = z.infer<typeof PublicarSolicitudRecursoSchema>;

/** Comando interno del caso de uso: los datos del formulario + quién publica, siempre resuelto por la sesión. */
export interface ComandoPublicarSolicitudRecurso extends DatosPublicarSolicitudRecursoDto {
  organizacionId: string;
}

export const SolicitudRecursoPublicadaSchema = registroOpenApi.register(
  'SolicitudRecursoPublicada',
  z
    .object({
      id: z.string().uuid(),
      organizacionId: z.string().uuid(),
      tipo: z.string(),
      descripcion: z.string(),
      reporteId: z.string().uuid().nullable(),
      estado: z.string(),
      createdAt: z.string(),
    })
    .openapi('SolicitudRecursoPublicada'),
);

export type SolicitudRecursoPublicada = z.infer<typeof SolicitudRecursoPublicadaSchema>;

registroOpenApi.registerPath({
  method: 'post',
  path: '/red-colaboracion/solicitudes',
  tags: ['Red de Colaboración'],
  summary: 'Publica una solicitud de recurso (tránsito, insumos, asistencia veterinaria o adopción) — exclusivo de rol organizacion.',
  request: {
    body: { content: { 'application/json': { schema: PublicarSolicitudRecursoSchema } } },
  },
  responses: {
    201: {
      description: 'Solicitud creada, con estado inicial "abierta".',
      content: { 'application/json': { schema: SolicitudRecursoPublicadaSchema } },
    },
    400: {
      description: 'Payload inválido (PEA-SIS-005).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
    401: { description: 'No hay sesión activa (PEA-SIS-001).', content: { 'application/json': { schema: ErrorApiSchema } } },
    403: {
      description: 'Quien invoca no tiene rol organizacion (PEA-SIS-002).',
      content: { 'application/json': { schema: ErrorApiSchema } },
    },
  },
});
