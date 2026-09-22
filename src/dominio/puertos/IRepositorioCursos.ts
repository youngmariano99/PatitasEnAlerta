export interface DatosCurso {
  titulo: string;
  descripcion: string;
  contenidoUrl: string | null;
}

/** Fila de `cursos` (docs/SCHEMA.md, Módulo 8). */
export interface Curso extends DatosCurso {
  id: string;
  publicadoPor: string;
  createdAt: Date;
}

export interface PaginaCursos {
  items: Curso[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Puerto hacia `cursos` (Módulo 8, Historia "Publicación de cursos de
 * tenencia responsable"). Alta restringida a `organizacion`/`municipio`
 * (Paso 1) + listado público paginado (para que un dueño pueda elegir a qué
 * curso inscribirse, mismo criterio de entrega incremental que
 * `IRepositorioProductosComercio`/`IRepositorioTemasForo`).
 */
export interface IRepositorioCursos {
  crear(publicadoPor: string, datos: DatosCurso): Promise<Curso>;

  /** Todos los cursos publicados (sin soft delete en `cursos`, docs/SCHEMA.md), paginados server-side, más recientes primero. */
  listar(pagina: number, porPagina: number): Promise<PaginaCursos>;
}
