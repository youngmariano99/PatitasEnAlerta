export interface DatosEvento {
  municipioId: string;
  titulo: string;
  tipo: string;
  direccion: string;
  latitud: number;
  longitud: number;
  fecha: Date;
  cuposTotales: number;
  requisitos: string | null;
}

/**
 * Entidad de dominio Evento (operativo municipal — Módulo 3). Representa
 * siempre un evento ya persistido (con `id` y `createdAt`) — el alta se
 * modela con `DatosEvento` (sin id) en el puerto del repositorio, mismo
 * criterio que Reporte.ts/Mascota.ts.
 */
export class Evento {
  private constructor(
    public readonly id: string,
    public readonly municipioId: string,
    public readonly titulo: string,
    public readonly tipo: string,
    public readonly direccion: string,
    public readonly latitud: number,
    public readonly longitud: number,
    public readonly fecha: Date,
    public readonly cuposTotales: number,
    public readonly requisitos: string | null,
    public readonly createdAt: Date,
  ) {}

  static reconstruir(id: string, datos: DatosEvento, createdAt: Date): Evento {
    return new Evento(
      id,
      datos.municipioId,
      datos.titulo,
      datos.tipo,
      datos.direccion,
      datos.latitud,
      datos.longitud,
      datos.fecha,
      datos.cuposTotales,
      datos.requisitos,
      createdAt,
    );
  }
}
