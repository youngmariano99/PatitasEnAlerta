'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ícono como divIcon (emoji + CSS) en vez de los PNG que trae el paquete
// `leaflet`: evita el fix manual de rutas de assets que ese bundling
// requiere bajo webpack/Next.js y no depende de ningún recurso externo más
// allá del propio tile server de OpenStreetMap (ya inherente a cualquier mapa).
const iconoPin = L.divIcon({
  className: 'selector-ubicacion-mapa__icono',
  html: '<span aria-hidden="true" style="font-size:28px;line-height:1;">📍</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface SelectorUbicacionMapaProps {
  centro: [number, number];
  posicion: [number, number] | null;
  onSeleccionar: (latitud: number, longitud: number) => void;
}

function CapturadorDeClicks({ onSeleccionar }: Pick<SelectorUbicacionMapaProps, 'onSeleccionar'>) {
  useMapEvents({
    click(evento) {
      onSeleccionar(evento.latlng.lat, evento.latlng.lng);
    },
  });
  return null;
}

/**
 * Este mapa se monta recién al llegar al paso 3 del wizard (dynamic import,
 * sin SSR) — si el layout del wizard todavía no terminó de asentarse en ese
 * instante, Leaflet calcula mal la posición interna de su pane y rompe con
 * "Cannot read properties of undefined (reading '_leaflet_pos')" apenas el
 * usuario hace zoom. Forzar un recálculo de tamaño en cuanto el mapa está
 * listo lo evita.
 */
function RecalculoDeTamano() {
  const mapa = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => mapa.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [mapa]);
  return null;
}

/**
 * Selector manual de ubicación sobre Leaflet/OpenStreetMap — fallback del
 * paso de geolocalización de app/reportes/nuevo/page.tsx cuando el
 * navegador no puede (o el usuario no quiere) compartir su posición
 * automática. Un click sobre el mapa mueve el pin y reporta la coordenada;
 * nunca bloquea el resto del formulario.
 */
export function SelectorUbicacionMapa({
  centro,
  posicion,
  onSeleccionar,
}: SelectorUbicacionMapaProps) {
  return (
    <div className="overflow-hidden rounded-md border border-surface2">
      <MapContainer
        center={centro}
        zoom={13}
        doubleClickZoom={false}
        style={{ height: 260, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecalculoDeTamano />
        <CapturadorDeClicks onSeleccionar={onSeleccionar} />
        {posicion ? <Marker position={posicion} icon={iconoPin} /> : null}
      </MapContainer>
    </div>
  );
}
