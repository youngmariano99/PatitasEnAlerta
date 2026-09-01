'use client';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { obtenerIconoEvento } from '@presentacion/componentes/mapas/iconosEventoFlyweight';

export interface MarcadorEvento {
  id: string;
  titulo: string;
  tipo: string;
  direccion: string;
  fecha: string;
  latitud: number;
  longitud: number;
}

interface MapaEventosProps {
  eventos: MarcadorEvento[];
  centro: [number, number];
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Mapa del calendario público de operativos (Módulo 3) — un marcador por
 * evento de la página actual, con el ícono Flyweight de
 * iconosEventoFlyweight.ts (compartido por tipo, nunca uno nuevo por
 * marcador). Mismo criterio que MapaReportes.tsx.
 */
export function MapaEventos({ eventos, centro }: MapaEventosProps) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-700">
      <MapContainer center={centro} zoom={13} style={{ height: 420, width: '100%' }}>
        <TileLayer
          attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {eventos.map((evento) => (
          <Marker key={evento.id} position={[evento.latitud, evento.longitud]} icon={obtenerIconoEvento(evento.tipo)}>
            <Popup>
              <span className="font-medium">{evento.titulo}</span>
              <br />
              {formatearFecha(evento.fecha)}
              <br />
              {evento.direccion}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
