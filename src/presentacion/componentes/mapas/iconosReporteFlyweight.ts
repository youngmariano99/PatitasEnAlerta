import L from 'leaflet';

/**
 * Flyweight (GoF): un único ícono compartido por cada combinación
 * (tipo, estado) — como mucho 3 tipos × 5 estados = 15 objetos, reutilizados
 * por los hasta 50 marcadores de una página del mapa en vez de crear un
 * `L.DivIcon` nuevo por cada reporte. Estado intrínseco (compartido, cacheado
 * acá) = apariencia según tipo/estado; estado extrínseco (no cacheado, vive
 * en cada `<Marker>`) = la posición lat/lon de cada reporte puntual.
 */
const CACHE_ICONOS = new Map<string, L.DivIcon>();

const EMOJI_POR_TIPO: Record<string, string> = {
  perdido: '🐾',
  encontrado: '📍',
  problematica: '⚠️',
};

const COLOR_POR_ESTADO: Record<string, string> = {
  reportado: '#3b82f6', // blue-500 — recién publicado
  en_revision: '#f59e0b', // amber-500 — en curso
  en_atencion: '#f59e0b',
  resuelto: '#10b981', // emerald-500 — cerrado con final feliz
  cerrado: '#64748b', // slate-500 — cerrado sin más detalle
};

export function obtenerIconoReporte(tipo: string, estado: string): L.DivIcon {
  const clave = `${tipo}:${estado}`;
  const cacheado = CACHE_ICONOS.get(clave);
  if (cacheado) return cacheado;

  const emoji = EMOJI_POR_TIPO[tipo] ?? '📌';
  const color = COLOR_POR_ESTADO[estado] ?? '#64748b';
  const icono = L.divIcon({
    className: 'icono-reporte-flyweight',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,0.4);">${emoji}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  CACHE_ICONOS.set(clave, icono);
  return icono;
}
