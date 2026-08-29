export type TipoVerificacion = 'veterinario' | 'municipio';
export type DecisionVerificacion = 'aprobado' | 'rechazado';

/** Fila de la cola de verificaciones pendientes, con el contexto mínimo para que un Administrador decida sin navegar a otra pantalla. */
export interface FilaVerificacionPendiente {
  id: string;
  usuarioId: string;
  tipo: TipoVerificacion;
  email: string;
  createdAt: Date;
  matricula: string | null;
  colegioEmisor: string | null;
  nombreInstitucional: string | null;
}

export interface PaginaVerificacionesPendientes {
  items: FilaVerificacionPendiente[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** Fila del historial de auditoría — verificaciones ya resueltas (aprobado/rechazado). Solo lectura. */
export interface FilaHistorialVerificacion {
  id: string;
  usuarioId: string;
  tipo: TipoVerificacion;
  email: string;
  estado: DecisionVerificacion;
  motivoRechazo: string | null;
  revisadoPor: string | null;
  resueltoEn: Date | null;
  createdAt: Date;
  matricula: string | null;
  colegioEmisor: string | null;
  nombreInstitucional: string | null;
}

export interface PaginaHistorialVerificaciones {
  items: FilaHistorialVerificacion[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface VerificacionResueltaResultado {
  verificacionId: string;
  usuarioId: string;
  tipo: TipoVerificacion;
  estado: DecisionVerificacion;
}
