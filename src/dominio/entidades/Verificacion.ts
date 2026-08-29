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

export interface VerificacionResueltaResultado {
  verificacionId: string;
  usuarioId: string;
  tipo: TipoVerificacion;
  estado: DecisionVerificacion;
}
