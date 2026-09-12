/**
 * Puerto (Adapter, GoF) hacia el proveedor externo de embeddings de texto.
 * BuscarReportesSimilares.ts depende únicamente de esta abstracción, nunca
 * del proveedor concreto — así se puede cambiar de proveedor (o pasar a uno
 * self-hosted) sin tocar el caso de uso, mismo criterio que
 * IAlmacenamientoImagenes con Cloudinary.
 */
export interface IGeneradorEmbeddings {
  /**
   * Longitud fija del vector devuelto: 1536, la misma dimensión fijada en
   * `reportes.descripcion_embedding VECTOR(1536)` (docs/SCHEMA.md). Un
   * proveedor con otra dimensión requiere migrar la columna, no solo cambiar
   * el adaptador.
   */
  generarEmbedding(texto: string): Promise<number[]>;
}
