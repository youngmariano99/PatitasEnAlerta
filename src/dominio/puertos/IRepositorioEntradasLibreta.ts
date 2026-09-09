/** Tipos de entrada soportados (docs/SCHEMA.md, `CHECK tipo` de `entradas_libreta_sanitaria`). */
export const TIPOS_ENTRADA_LIBRETA = ['vacuna', 'visita', 'observacion'] as const;
export type TipoEntradaLibreta = (typeof TIPOS_ENTRADA_LIBRETA)[number];

export interface DatosEntradaLibreta {
  tipo: TipoEntradaLibreta;
  descripcion: string;
  /** Formato `AAAA-MM-DD` — la columna es `DATE`, sin componente de hora. */
  fecha: string;
}

export interface EntradaLibretaPersistida extends DatosEntradaLibreta {
  id: string;
  mascotaId: string;
  veterinarioId: string;
  createdAt: Date;
}

/** Página de historial cronológico (tope 50, docs/REQUISITOS.md NFR de paginación server-side). */
export interface PaginaEntradasLibreta {
  items: EntradaLibretaPersistida[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Puerto hacia la persistencia de `entradas_libreta_sanitaria` (Módulo 4).
 * `RegistrarEntradaLibreta.ts`/`ListarLibretaSanitaria.ts` dependen
 * únicamente de esta abstracción, nunca de Prisma directamente. La
 * verificación de autorización activa (escritura) o de pertenencia
 * (lectura) vive en el caso de uso correspondiente, no acá — este puerto
 * asume que ya se decidió que la operación es legítima.
 */
export interface IRepositorioEntradasLibreta {
  crear(mascotaId: string, veterinarioId: string, datos: DatosEntradaLibreta): Promise<EntradaLibretaPersistida>;

  /**
   * Historial cronológico completo de una mascota (todas las entradas, de
   * cualquier veterinario que haya escrito en ella), paginado (tope 50),
   * orden por `fecha` descendente y `createdAt` descendente como desempate
   * — Historia "Consulta del historial de la libreta sanitaria" (Módulo 4).
   * Siempre filtra `deletedAt IS NULL` (soft delete, docs/SCHEMA.md).
   */
  listarPorMascota(mascotaId: string, pagina: number, porPagina: number): Promise<PaginaEntradasLibreta>;
}
