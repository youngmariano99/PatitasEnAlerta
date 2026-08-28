export interface DatosMascota {
  dueñoId: string;
  nombre: string;
  especie: string;
  fotoUrl: string;
  raza: string | null;
  edadAproximada: number | null;
  identificacionChip: string | null;
}

/**
 * Entidad de dominio Mascota. Representa siempre una mascota ya persistida
 * (con `id`) — el alta se modela con `DatosMascota` (sin id) en el puerto del
 * repositorio, evitando un `id` opcional artificial en la entidad.
 */
export class Mascota {
  private constructor(
    public readonly id: string,
    public readonly dueñoId: string,
    public readonly nombre: string,
    public readonly especie: string,
    public readonly fotoUrl: string,
    public readonly raza: string | null,
    public readonly edadAproximada: number | null,
    public readonly identificacionChip: string | null,
  ) {}

  static reconstruir(id: string, datos: DatosMascota): Mascota {
    return new Mascota(
      id,
      datos.dueñoId,
      datos.nombre,
      datos.especie,
      datos.fotoUrl,
      datos.raza,
      datos.edadAproximada,
      datos.identificacionChip,
    );
  }
}
