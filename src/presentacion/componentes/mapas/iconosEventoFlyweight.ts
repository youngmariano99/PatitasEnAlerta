import L from 'leaflet';

/**
 * Flyweight (GoF): un único ícono compartido por cada `tipo` de operativo —
 * a lo sumo 4 objetos (docs/SCHEMA.md, CHECK tipo sobre `eventos`),
 * reutilizados por los hasta 50 marcadores de una página del calendario en
 * vez de crear un `L.DivIcon` nuevo por cada evento. Estado intrínseco
 * (compartido, cacheado acá) = apariencia según tipo; estado extrínseco (no
 * cacheado, vive en cada `<Marker>`) = la posición lat/lon de cada
 * operativo puntual. Mismo criterio que iconosReporteFlyweight.ts.
 */
const CACHE_ICONOS = new Map<string, L.DivIcon>();

const EMOJI_POR_TIPO: Record<string, string> = {
  castracion: '✂️',
  vacunacion: '💉',
  desparasitacion: '💊',
  otro: '📌',
};

export function obtenerIconoEvento(tipo: string): L.DivIcon {
  const cacheado = CACHE_ICONOS.get(tipo);
  if (cacheado) return cacheado;

  const emoji = EMOJI_POR_TIPO[tipo] ?? '📌';
  const icono = L.divIcon({
    className: 'icono-evento-flyweight',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#3b82f6;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,0.4);">${emoji}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  CACHE_ICONOS.set(tipo, icono);
  return icono;
}
