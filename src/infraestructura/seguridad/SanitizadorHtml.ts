import DOMPurify from 'isomorphic-dompurify';

/**
 * Anti-XSS obligatorio para contenido de usuario antes de persistir/renderizar
 * (CLAUDE.md, NFR Seguridad; docs/REQUISITOS.md: "DOMPurify obligatorio en
 * toda descripción... antes de renderizar"). `ALLOWED_TAGS: []` despoja
 * cualquier etiqueta HTML — `productos_comercio.descripcion` es texto plano,
 * sin editor de texto enriquecido, así que no hay ningún tag legítimo que
 * preservar: la opción más simple es también la más robusta acá (Sección 7,
 * excepción de seguridad).
 */
export function sanitizarDescripcion(valor: string | null): string | null {
  if (valor === null) return null;
  return DOMPurify.sanitize(valor, { ALLOWED_TAGS: [] }).trim();
}
