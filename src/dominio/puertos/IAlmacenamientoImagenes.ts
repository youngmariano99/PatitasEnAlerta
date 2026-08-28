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
}
