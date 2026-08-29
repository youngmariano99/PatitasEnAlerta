// Catálogo de roles (docs/SCHEMA.md, Módulo 1): 1=dueño, 2=veterinario, 3=municipio, 4=administrador.
export const ROL_VETERINARIO_ID = 2;
export const ESTADO_VERIFICACION_PENDIENTE = 'pendiente';

export interface DatosPerfilVeterinario {
  email: string;
  matricula: string;
  colegioEmisor: string;
  estadoVerificacion: string;
}

/** Entidad de dominio del perfil profesional de un veterinario ya persistido. */
export class PerfilVeterinario {
  private constructor(
    public readonly usuarioId: string,
    public readonly email: string,
    public readonly matricula: string,
    public readonly colegioEmisor: string,
    public readonly estadoVerificacion: string,
  ) {}

  static reconstruir(usuarioId: string, datos: DatosPerfilVeterinario): PerfilVeterinario {
    return new PerfilVeterinario(usuarioId, datos.email, datos.matricula, datos.colegioEmisor, datos.estadoVerificacion);
  }
}
