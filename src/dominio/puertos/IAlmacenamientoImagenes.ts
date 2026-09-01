/**
 * Puerto hacia el proveedor de almacenamiento de imágenes (Cloudinary en
 * infraestructura). La subida en sí ocurre desde el cliente antes del
 * submit (con un upload preset unsigned — ver docs/SETUP.md); este puerto
 * cubre la validación server-side de que la URL recibida efectivamente
 * pertenece a nuestra cuenta de Cloudinary, para no persistir a ciegas
 * cualquier URL que un cliente arme a mano (defensa en profundidad, ya que
 * el endpoint nunca vuelve a subir el archivo).
 */
export interface IAlmacenamientoImagenes {
  esUrlDeImagenValida(url: string): boolean;

  /**
   * Confirma que, además de pertenecer a nuestra cuenta, `url` corresponde a
   * una subida real hecha por `usuarioId` — consultando la metadata
   * `context` que Cloudinary guardó al momento de la subida (Admin API, ver
   * CloudinaryStorageAdapter.ts), nunca confiando en lo que el propio
   * cliente afirme. Exclusivo de ValidadorContenidoImagen (Módulo 2,
   * "Validación estructurada de reportes antes de publicar") — RegistrarMascota
   * y ActualizarMascota (Módulo 1) siguen usando solo `esUrlDeImagenValida`,
   * porque su flujo de subida no taguea la foto por usuario y no forma parte
   * del alcance de este endurecimiento.
   */
  fueSubidaPor(url: string, usuarioId: string): Promise<boolean>;
}
