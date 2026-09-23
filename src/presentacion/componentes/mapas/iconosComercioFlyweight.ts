import L from 'leaflet';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PawPrint, Pill, Scissors, Store, Wheat, type LucideIcon } from 'lucide-react';

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

const ICONO_POR_TIPO: Record<string, LucideIcon> = {
  pet_shop: PawPrint,
  forrajeria: Wheat,
  peluqueria: Scissors,
  farmacia_veterinaria: Pill,
  otro: Store,
};

export function obtenerIconoComercio(tipoComercio: string): L.DivIcon {
  const cacheado = CACHE_ICONOS.get(tipoComercio);
  if (cacheado) return cacheado;

  const IconoComponente = ICONO_POR_TIPO[tipoComercio] ?? Store;
  // Blanco fijo, mismo criterio que iconosReporteFlyweight.ts: glyph de
  // marcador Leaflet fuera del árbol de React, no un elemento de UI temático.
  const svgMarkup = renderToStaticMarkup(
    createElement(IconoComponente, { size: 16, color: '#fff' }),
  );
  const icono = L.divIcon({
    className: 'icono-comercio-flyweight',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#8b5cf6;box-shadow:0 1px 3px rgba(0,0,0,0.4);">${svgMarkup}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  CACHE_ICONOS.set(tipoComercio, icono);
  return icono;
}
