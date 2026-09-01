import type { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';

export interface DatosNuevaFichaAdopcion {
  municipioId: string;
  nombreAnimal: string;
  especie: string;
  edadAproximada: number | null;
  tamano: string | null;
  temperamento: string | null;
  estadoSalud: string | null;
  requisitosAdopcion: string | null;
  fotoUrl: string;
}

/** `estado` deliberadamente ausente: se edita únicamente vía `darDeBaja` (nunca un PATCH genérico de estado). */
export type CambiosFichaAdopcion = Partial<Omit<DatosNuevaFichaAdopcion, 'municipioId'>>;

export interface FiltrosListadoFichasAdopcion {
  municipioId: string;
  estado?: string;
}

export interface PaginaFichasAdopcion {
  items: FichaAdopcion[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Puerto hacia la persistencia de la vitrina de adopción (Módulo 3).
 * PublicarFichaAdopcion/ActualizarFichaAdopcion/DarDeBajaFichaAdopcion
 * dependen únicamente de esta abstracción — nunca de Prisma directamente.
 *
 * Regla no negociable (Paso 3 del ticket): `darDeBaja` NUNCA hace un DELETE
 * físico — mueve `estado` a `'baja'` (CHECK ya vigente en `vitrina_adopcion`,
 * docs/SCHEMA.md), la misma fila sigue existiendo para auditoría/histórico.
 */
export interface IRepositorioFichasAdopcion {
  crear(datos: DatosNuevaFichaAdopcion): Promise<FichaAdopcion>;
  buscarPorId(id: string): Promise<FichaAdopcion | null>;
  actualizar(id: string, cambios: CambiosFichaAdopcion): Promise<FichaAdopcion>;
  darDeBaja(id: string): Promise<FichaAdopcion>;
  listarPorMunicipio(filtros: FiltrosListadoFichasAdopcion, pagina: number, porPagina: number): Promise<PaginaFichasAdopcion>;
  /**
   * Vitrina pública (Historia "Consulta pública de la vitrina de adopción"):
   * paginado (tope 50), filtrado exclusivamente por `estado='disponible'` —
   * nunca 'adoptado' ni 'baja', sin importar el municipio. Complementa
   * (nunca reemplaza) la RLS `vitrina_select_publico`.
   */
  listarPublico(pagina: number, porPagina: number): Promise<PaginaFichasAdopcion>;
}
