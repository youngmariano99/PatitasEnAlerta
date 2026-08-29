// Catálogo de roles (docs/SCHEMA.md, Módulo 1): 1=dueño, 2=veterinario, 3=municipio, 4=administrador.
export const ROL_MUNICIPIO_ID = 3;

// El municipio lo crea directamente un Administrador (AUTH-03): el alta en
// sí ES la aprobación, a diferencia del veterinario que queda 'pendiente'
// hasta una revisión posterior — por eso no hay fila en `verificaciones`.
export const ESTADO_VERIFICACION_MUNICIPIO = 'verificado';

export interface DatosPerfilMunicipio {
  email: string;
  nombreInstitucional: string;
  estadoVerificacion: string;
}

/** Entidad de dominio de la cuenta institucional del municipio, ya persistida. */
export class PerfilMunicipio {
  private constructor(
    public readonly usuarioId: string,
    public readonly email: string,
    public readonly nombreInstitucional: string,
    public readonly estadoVerificacion: string,
  ) {}

  static reconstruir(usuarioId: string, datos: DatosPerfilMunicipio): PerfilMunicipio {
    return new PerfilMunicipio(usuarioId, datos.email, datos.nombreInstitucional, datos.estadoVerificacion);
  }
}
