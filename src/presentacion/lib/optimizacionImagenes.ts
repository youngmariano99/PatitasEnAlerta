/**
 * Utilidades de optimización y entrega dinámica de imágenes vía Cloudinary.
 *
 * Transforma URLs de Cloudinary sobre la marcha para descargar únicamente
 * el tamaño requerido, en formato moderno (WebP/AVIF con f_auto) y con
 * compresión inteligente (q_auto), reduciendo drásticamente el uso de banda
 * ancha y el consumo del plan gratuito.
 */

export interface OpcionesOptimizacionCloudinary {
  ancho?: number;
  alto?: number;
  modo?: 'fill' | 'fit' | 'thumb' | 'limit' | 'scale';
  calidad?: 'auto' | 'auto:eco' | 'auto:good' | 'auto:best';
  gravedad?: 'auto' | 'face' | 'center';
}

export const PRESETS_IMAGEN: Record<string, OpcionesOptimizacionCloudinary> = {
  /** Burbuja de foto para el pin de mapa (micro-miniatura ~2KB) */
  pinMapa: { ancho: 72, alto: 72, modo: 'fill', gravedad: 'auto', calidad: 'auto' },
  /** Miniatura para listas laterales, tablas y resúmenes (~8KB) */
  miniatura: { ancho: 160, alto: 160, modo: 'fill', gravedad: 'auto', calidad: 'auto' },
  /** Tarjeta de feed / muro de reportes (~15KB) */
  tarjetaFeed: { ancho: 400, alto: 300, modo: 'fill', gravedad: 'auto', calidad: 'auto' },
  /** Vista en popup de mapa (~12KB) */
  popupMapa: { ancho: 320, alto: 200, modo: 'fill', gravedad: 'auto', calidad: 'auto' },
  /** Detalle completo del reporte (~40KB) */
  detalle: { ancho: 800, alto: 600, modo: 'limit', calidad: 'auto' },
};

const MARCADOR_UPLOAD = '/image/upload/';

/**
 * Optimiza una URL de Cloudinary agregando parámetros de transformación.
 * Si la URL no pertenece a Cloudinary o no es válida, se devuelve sin modificar.
 */
export function optimizarImagenCloudinary(
  urlOriginal: string | null | undefined,
  opciones: OpcionesOptimizacionCloudinary = {},
): string {
  if (!urlOriginal || typeof urlOriginal !== 'string') {
    return '';
  }

  const indiceUpload = urlOriginal.indexOf(MARCADOR_UPLOAD);
  if (indiceUpload === -1) {
    return urlOriginal;
  }

  const segmentoTransformaciones: string[] = ['f_auto'];
  const calidad = opciones.calidad ?? 'auto';
  segmentoTransformaciones.push(`q_${calidad}`);

  const ancho = opciones.ancho ? Math.round(opciones.ancho) : undefined;
  const alto = opciones.alto ? Math.round(opciones.alto) : undefined;

  if (ancho) {
    segmentoTransformaciones.push(`w_${ancho}`);
  }
  if (alto) {
    segmentoTransformaciones.push(`h_${alto}`);
  }

  const modo = opciones.modo ?? (ancho && alto ? 'fill' : undefined);
  if (modo) {
    segmentoTransformaciones.push(`c_${modo}`);
  }

  const gravedad = opciones.gravedad ?? (modo === 'fill' ? 'auto' : undefined);
  if (gravedad) {
    segmentoTransformaciones.push(`g_${gravedad}`);
  }

  // Orden alfabético de transformaciones para consistencia de cache
  segmentoTransformaciones.sort();
  const cadenaTransformaciones = segmentoTransformaciones.join(',');

  const prefijo = urlOriginal.slice(0, indiceUpload + MARCADOR_UPLOAD.length);
  const sufijo = urlOriginal.slice(indiceUpload + MARCADOR_UPLOAD.length);

  // Si ya tiene transformaciones inyectadas previamente que comiencen con f_auto o c_,
  // se reemplazan para no apilarlas.
  const regexTransformacionesPrevias = /^(?:[a-z]_[^/]+,)*[a-z]_[^/]+\//;
  const sufijoLimpio = sufijo.replace(regexTransformacionesPrevias, '');

  return `${prefijo}${cadenaTransformaciones}/${sufijoLimpio}`;
}
