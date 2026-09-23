import L from 'leaflet';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, Pill, Scissors, Syringe, type LucideIcon } from 'lucide-react';

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

const ICONO_POR_TIPO: Record<string, LucideIcon> = {
  castracion: Scissors,
  vacunacion: Syringe,
  desparasitacion: Pill,
  otro: MapPin,
};

// token `accent` (#0073E6, Azul Cívico) — mismo azul que el resto de la UI
// usa para "operativo/institucional", en vez de un color ajeno al sistema.
const COLOR_OPERATIVO = '#0073E6';

export function obtenerIconoEvento(tipo: string): L.DivIcon {
  const cacheado = CACHE_ICONOS.get(tipo);
  if (cacheado) return cacheado;

  const IconoComponente = ICONO_POR_TIPO[tipo] ?? MapPin;
  // Blanco fijo, mismo criterio que iconosReporteFlyweight.ts: glyph de
  // marcador Leaflet fuera del árbol de React, no un elemento de UI temático.
  const svgMarkup = renderToStaticMarkup(
    createElement(IconoComponente, { size: 16, color: '#fff' }),
  );
  const icono = L.divIcon({
    className: 'icono-evento-flyweight',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${COLOR_OPERATIVO};box-shadow:0 1px 3px rgba(0,0,0,0.4);border:2px solid #fff;">${svgMarkup}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  CACHE_ICONOS.set(tipo, icono);
  return icono;
}
