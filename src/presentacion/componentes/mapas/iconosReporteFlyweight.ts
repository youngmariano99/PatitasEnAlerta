import L from 'leaflet';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Cat, Dog, PawPrint, TriangleAlert, type LucideIcon } from 'lucide-react';

/**
 * Flyweight (GoF): un único ícono compartido por cada combinación
 * (tipo, estado, especie normalizada) — reutilizado por los hasta 50
 * marcadores de una página del mapa en vez de crear un `L.DivIcon` nuevo por
 * cada reporte. Estado intrínseco (compartido, cacheado acá) = apariencia
 * según tipo/especie; estado extrínseco (no cacheado, vive en cada
 * `<Marker>`) = la posición lat/lon de cada reporte puntual.
 *
 * El color se define por `tipo` (perdido/encontrado/problematica) — es la
 * distinción más urgente para un vecino ("¿esto es una mascota perdida o
 * encontrada?"). El ícono, dentro de perdido/encontrado, se afina por
 * `especie` (perro/gato) para que además se pueda distinguir sin tener que
 * abrir cada marcador — cualquier valor que no sea exactamente "perro" o
 * "gato" (texto libre, `null`, datos previos a este cambio) cae al genérico
 * `PawPrint`. `problematica` nunca usa ícono de especie (`TriangleAlert`
 * siempre) — no es una mascota. El `estado` puntual (reportado/en
 * revisión/resuelto/etc.) sigue visible como texto en el popup — nunca solo
 * color, siempre acompañado de ícono + texto (`docs/DISENO.md`).
 */
const CACHE_ICONOS = new Map<string, L.DivIcon>();

const COLOR_POR_TIPO: Record<string, string> = {
  perdido: '#B3261E', // token `danger` — mascota perdida, urgencia real
  encontrado: '#0F7B4D', // token `success` — mascota encontrada
  problematica: '#C44601', // token `alert` — riesgo sanitario urbano, uso legítimo del naranja de emergencia
};

/**
 * Normaliza `especie` a una clave de caché acotada — nunca una por cada
 * valor de texto libre posible (crecimiento sin límite del Map), solo
 * distingue perro/gato, todo lo demás colapsa a un único bucket genérico.
 */
function normalizarEspecie(especie: string | null | undefined): 'perro' | 'gato' | '' {
  const valor = especie?.trim().toLowerCase();
  if (valor === 'perro' || valor === 'gato') return valor;
  return '';
}

function iconoPorTipoYEspecie(tipo: string, especieNormalizada: string): LucideIcon {
  if (tipo === 'problematica') return TriangleAlert;
  if (especieNormalizada === 'perro') return Dog;
  if (especieNormalizada === 'gato') return Cat;
  return PawPrint;
}

export function obtenerIconoReporte(
  tipo: string,
  estado: string,
  especie?: string | null,
): L.DivIcon {
  const especieNormalizada = normalizarEspecie(especie);
  const clave = `${tipo}:${estado}:${especieNormalizada}`;
  const cacheado = CACHE_ICONOS.get(clave);
  if (cacheado) return cacheado;

  const IconoComponente = iconoPorTipoYEspecie(tipo, especieNormalizada);
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
