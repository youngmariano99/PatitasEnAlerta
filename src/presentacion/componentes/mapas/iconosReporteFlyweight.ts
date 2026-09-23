import L from 'leaflet';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PawPrint, TriangleAlert, type LucideIcon } from 'lucide-react';

/**
 * Flyweight (GoF): un único ícono compartido por cada `tipo` de reporte — a
 * lo sumo 3 objetos (perdido/encontrado/problematica), reutilizados por los
 * hasta 50 marcadores de una página del mapa en vez de crear un `L.DivIcon`
 * nuevo por cada reporte. Estado intrínseco (compartido, cacheado acá) =
 * apariencia según tipo; estado extrínseco (no cacheado, vive en cada
 * `<Marker>`) = la posición lat/lon de cada reporte puntual.
 *
 * El color/ícono se definen por `tipo` (no por `estado`): es lo que un
 * vecino necesita distinguir de un vistazo en el mapa ("¿esto es una
 * mascota perdida o encontrada?"), el `estado` puntual (reportado/en
 * revisión/resuelto/etc.) sigue visible como texto en el popup — nunca solo
 * color, siempre acompañado de ícono + texto (`docs/DISENO.md`).
 *
 * `perdido`/`encontrado` comparten la misma silueta (`PawPrint`) — la
 * distinción es el color (rojo/verde), como en la referencia visual del
 * usuario; `problematica` usa un ícono distinto porque no es una mascota.
 */
const CACHE_ICONOS = new Map<string, L.DivIcon>();

const ICONO_POR_TIPO: Record<string, LucideIcon> = {
  perdido: PawPrint,
  encontrado: PawPrint,
  problematica: TriangleAlert,
};

const COLOR_POR_TIPO: Record<string, string> = {
  perdido: '#B3261E', // token `danger` — mascota perdida, urgencia real
  encontrado: '#0F7B4D', // token `success` — mascota encontrada
  problematica: '#C44601', // token `alert` — riesgo sanitario urbano, uso legítimo del naranja de emergencia
};

export function obtenerIconoReporte(tipo: string, estado: string): L.DivIcon {
  const clave = `${tipo}:${estado}`;
  const cacheado = CACHE_ICONOS.get(clave);
  if (cacheado) return cacheado;

  const IconoComponente = ICONO_POR_TIPO[tipo] ?? PawPrint;
  // Blanco fijo (no un token del sistema de diseño): es un glyph dentro de un
  // marcador Leaflet, renderizado fuera del árbol de React vía `L.divIcon`,
  // no un elemento de UI temático — no aplica la regla de "sin colores nuevos".
  const svgMarkup = renderToStaticMarkup(
    createElement(IconoComponente, { size: 16, color: '#fff' }),
  );
  const color = COLOR_POR_TIPO[tipo] ?? '#5B6470';
  const icono = L.divIcon({
    className: 'icono-reporte-flyweight',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};box-shadow:0 1px 3px rgba(0,0,0,0.4);border:2px solid #fff;">${svgMarkup}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  CACHE_ICONOS.set(clave, icono);
  return icono;
}
