import L from 'leaflet';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, PawPrint, TriangleAlert, type LucideIcon } from 'lucide-react';

/**
 * Flyweight (GoF): un único ícono compartido por cada combinación
 * (tipo, estado) — como mucho 3 tipos × 5 estados = 15 objetos, reutilizados
 * por los hasta 50 marcadores de una página del mapa en vez de crear un
 * `L.DivIcon` nuevo por cada reporte. Estado intrínseco (compartido, cacheado
 * acá) = apariencia según tipo/estado; estado extrínseco (no cacheado, vive
 * en cada `<Marker>`) = la posición lat/lon de cada reporte puntual.
 */
const CACHE_ICONOS = new Map<string, L.DivIcon>();

const ICONO_POR_TIPO: Record<string, LucideIcon> = {
  perdido: PawPrint,
  encontrado: MapPin,
  problematica: TriangleAlert,
};

const COLOR_POR_ESTADO: Record<string, string> = {
  reportado: '#0073E6', // Azul Cívico — recién publicado
  en_revision: '#C44601', // Naranja Alerta — en curso
  en_atencion: '#C44601',
  resuelto: '#008080', // Verde Sanitario — cerrado con final feliz
  cerrado: '#5B6470', // gris muted — cerrado sin más detalle
};

export function obtenerIconoReporte(tipo: string, estado: string): L.DivIcon {
  const clave = `${tipo}:${estado}`;
  const cacheado = CACHE_ICONOS.get(clave);
  if (cacheado) return cacheado;

  const IconoComponente = ICONO_POR_TIPO[tipo] ?? MapPin;
  // Blanco fijo (no un token del sistema de diseño): es un glyph dentro de un
  // marcador Leaflet, renderizado fuera del árbol de React vía `L.divIcon`,
  // no un elemento de UI temático — no aplica la regla de "sin colores nuevos".
  const svgMarkup = renderToStaticMarkup(
    createElement(IconoComponente, { size: 16, color: '#fff' }),
  );
  const color = COLOR_POR_ESTADO[estado] ?? '#5B6470';
  const icono = L.divIcon({
    className: 'icono-reporte-flyweight',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};box-shadow:0 1px 3px rgba(0,0,0,0.4);">${svgMarkup}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  CACHE_ICONOS.set(clave, icono);
  return icono;
}
