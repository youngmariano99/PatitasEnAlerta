import type {
  PaginaVerificacionesPendientes,
  PaginaHistorialVerificaciones,
  VerificacionResueltaResultado,
  DecisionVerificacion,
} from '@dominio/entidades/Verificacion';

export interface DatosResolverVerificacion {
  verificacionId: string;
  administradorId: string;
  decision: DecisionVerificacion;
  motivoRechazo: string | null;
}

/**
 * Puerto hacia la cola de verificaciones. `resolver` es una única
 * transacción: verificación + usuarios.estado_verificacion + verificado_en
 * del perfil correspondiente (Paso 2/3) — nunca sobreescribe una fila ya
 * resuelta (verificación técnica del ticket): si `estado` ya no es
 * 'pendiente', la implementación tiene que rechazar con
 * VerificacionYaResueltaError en vez de pisar revisado_por/resuelto_en.
 *
 * `listarResueltas` (AUTH-09) es de solo lectura: el historial de auditoría
 * nunca pasa por `resolver` ni ningún otro método de escritura.
 */
export interface IRepositorioVerificaciones {
  listarPendientes(pagina: number, porPagina: number): Promise<PaginaVerificacionesPendientes>;
  listarResueltas(pagina: number, porPagina: number): Promise<PaginaHistorialVerificaciones>;
  resolver(datos: DatosResolverVerificacion): Promise<VerificacionResueltaResultado>;
}
