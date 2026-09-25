import L from 'leaflet';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarDays } from 'lucide-react';

/**
 * Flyweight (GoF): un único ícono de almanaque (`CalendarDays`) para todo
 * operativo, sin importar `tipo` — coincide con `LeyendaMapa` de
 * `MapaComunidad.tsx`, que ya usa ese mismo ícono para "Operativos"
 * (diferenciar por tipo, ej. Scissors/Syringe/Pill, hacía que el pin real no
 * coincidiera con la leyenda). Se cachea una única instancia y se reutiliza
 * en todos los marcadores de la página. Mismo criterio de Flyweight que
 * iconosReporteFlyweight.ts, con estado intrínseco fijo (no varía por
 * evento) y el extrínseco (lat/lon) viviendo en cada `<Marker>`.
 */
let iconoCacheado: L.DivIcon | null = null;

// token `accent` (#0073E6, Azul Cívico) — mismo azul que el resto de la UI
// usa para "operativo/institucional", en vez de un color ajeno al sistema.
const COLOR_OPERATIVO = '#0073E6';

export function obtenerIconoEvento(): L.DivIcon {
  if (iconoCacheado) return iconoCacheado;

  // Blanco fijo, mismo criterio que iconosReporteFlyweight.ts: glyph de
  // marcador Leaflet fuera del árbol de React, no un elemento de UI temático.
  const svgMarkup = renderToStaticMarkup(createElement(CalendarDays, { size: 16, color: '#fff' }));
  iconoCacheado = L.divIcon({
    className: 'icono-evento-flyweight',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${COLOR_OPERATIVO};box-shadow:0 1px 3px rgba(0,0,0,0.4);border:2px solid #fff;">${svgMarkup}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return iconoCacheado;
}
