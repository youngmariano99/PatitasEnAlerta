'use client';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { obtenerIconoComercio } from '@presentacion/componentes/mapas/iconosComercioFlyweight';

export interface MarcadorComercio {
  id: string;
  nombreComercio: string;
  tipoComercio: string;
  direccion: string;
  latitud: number;
  longitud: number;
}

interface MapaComerciosProps {
  comercios: MarcadorComercio[];
  centro: [number, number];
}

/**
 * Mapa del buscador de comercios (Módulo 7, Paso 2) — un marcador por
 * comercio de la página actual del listado, con el ícono Flyweight de
 * iconosComercioFlyweight.ts (compartido por `tipo_comercio`, nunca uno
 * nuevo por marcador). Recibe exactamente el mismo array `comercios` que
 * renderiza el listado paginado — es lo que garantiza la sincronización
 * mapa/listado del AC: ambos son una vista distinta del mismo estado.
 */
export function MapaComercios({ comercios, centro }: MapaComerciosProps) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-700">
      <MapContainer center={centro} zoom={13} style={{ height: 420, width: '100%' }}>
        <TileLayer
          attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {comercios.map((comercio) => (
          <Marker
            key={comercio.id}
            position={[comercio.latitud, comercio.longitud]}
            icon={obtenerIconoComercio(comercio.tipoComercio)}
          >
            <Popup>
              <span className="font-medium">{comercio.nombreComercio}</span>
              <br />
              {comercio.direccion}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
