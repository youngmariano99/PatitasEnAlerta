/** Datos de una franja de disponibilidad semanal recurrente (docs/SCHEMA.md, `disponibilidad_veterinario`). */
export interface DatosDisponibilidad {
  diaSemana: number;
  /** Formato `HH:mm` (24hs) — nunca `Date`: la columna es `TIME`, sin fecha asociada. */
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

export interface FranjaDisponibilidadPersistida extends DatosDisponibilidad {
  id: string;
  veterinarioId: string;
  createdAt: Date;
}

/**
 * Puerto hacia la persistencia de la agenda semanal propia de cada
 * veterinario (Módulo 4, Historia "Configuración de agenda del
 * veterinario"). `ConfigurarDisponibilidad.ts`/`DarDeBajaDisponibilidad.ts`/
 * `ListarDisponibilidadPropia.ts`/`GenerarTurnosVeterinario.ts` dependen
 * únicamente de esta abstracción, nunca de Prisma directamente.
 */
export interface IRepositorioDisponibilidad {
  crear(veterinarioId: string, datos: DatosDisponibilidad): Promise<FranjaDisponibilidadPersistida>;
  /** Franja ya configurada para ese día de la semana, si existe (`null` si no hay o está soft-deleted). Un veterinario tiene a lo sumo una franja activa por `diaSemana`. */
  obtenerActual(veterinarioId: string, diaSemana: number): Promise<FranjaDisponibilidadPersistida | null>;
  actualizar(id: string, datos: DatosDisponibilidad): Promise<FranjaDisponibilidadPersistida>;
  /** Soft delete + `activo=false`; `null` si no existe, ya está eliminada, o no pertenece a `veterinarioId` (anti-IDOR). */
  eliminar(id: string, veterinarioId: string): Promise<FranjaDisponibilidadPersistida | null>;
  /** Todas las franjas propias no eliminadas (activas e inactivas) — "Configuración de agenda", vista completa del propio veterinario. */
  listarPropias(veterinarioId: string): Promise<FranjaDisponibilidadPersistida[]>;
  /** Solo franjas `activo=true` no eliminadas — la fuente que consume `GenerarTurnosVeterinario` para calcular qué turnos tendrían que existir. */
  listarActivas(veterinarioId: string): Promise<FranjaDisponibilidadPersistida[]>;
}
