import type {
  PaginaVerificacionesPendientes,
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
 */
export interface IRepositorioVerificaciones {
  listarPendientes(pagina: number, porPagina: number): Promise<PaginaVerificacionesPendientes>;
  resolver(datos: DatosResolverVerificacion): Promise<VerificacionResueltaResultado>;
}
