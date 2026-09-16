import L from 'leaflet';

/**
 * Flyweight (GoF) — un único ícono compartido por `tipo_comercio` (5 valores
 * como mucho, docs/SCHEMA.md `CHECK tipo_comercio`), reutilizado por todos
 * los marcadores de la página del mapa en vez de crear un `L.DivIcon` nuevo
 * por cada comercio (AC explícito del ticket: "cada tipo usa un ícono
 * reutilizado vía Flyweight, no se instancia un ícono nuevo por marcador").
 * Estado intrínseco (compartido, cacheado acá) = apariencia según tipo;
 * estado extrínseco (no cacheado, vive en cada `<Marker>`) = la posición
 * lat/lon de cada comercio puntual. Mismo criterio que `iconosReporteFlyweight.ts`.
 */
const CACHE_ICONOS = new Map<string, L.DivIcon>();

const EMOJI_POR_TIPO: Record<string, string> = {
  pet_shop: '🐾',
  forrajeria: '🌾',
  peluqueria: '✂️',
  farmacia_veterinaria: '💊',
  otro: '🏪',
};

export function obtenerIconoComercio(tipoComercio: string): L.DivIcon {
  const cacheado = CACHE_ICONOS.get(tipoComercio);
  if (cacheado) return cacheado;

  const emoji = EMOJI_POR_TIPO[tipoComercio] ?? '🏪';
  const icono = L.divIcon({
    className: 'icono-comercio-flyweight',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#8b5cf6;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,0.4);">${emoji}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  CACHE_ICONOS.set(tipoComercio, icono);
  return icono;
}
