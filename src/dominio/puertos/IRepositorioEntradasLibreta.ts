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

/**
 * Puerto hacia la persistencia de `entradas_libreta_sanitaria` (Módulo 4).
 * `RegistrarEntradaLibreta.ts` depende únicamente de esta abstracción, nunca
 * de Prisma directamente. La verificación de autorización activa vive en el
 * caso de uso (vía `IRepositorioAutorizacionesLibreta`), no acá — este
 * puerto asume que ya se decidió que la escritura es legítima.
 */
export interface IRepositorioEntradasLibreta {
  crear(mascotaId: string, veterinarioId: string, datos: DatosEntradaLibreta): Promise<EntradaLibretaPersistida>;
}
