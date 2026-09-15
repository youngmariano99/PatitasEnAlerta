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

/**
 * Puerto hacia `cursos` (Módulo 8, Historia "Publicación de cursos de
 * tenencia responsable"). Acotado al alta restringida a `organizacion`/
 * `municipio` (Paso 1 del ticket) — el listado/inscripción quedan para el
 * ticket que implemente esa historia puntual, mismo criterio de entrega
 * incremental ya establecido en `IRepositorioProductosComercio`.
 */
export interface IRepositorioCursos {
  crear(publicadoPor: string, datos: DatosCurso): Promise<Curso>;
}
