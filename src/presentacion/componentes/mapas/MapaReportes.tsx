'use client';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { obtenerIconoReporte } from '@presentacion/componentes/mapas/iconosReporteFlyweight';

export interface MarcadorReporte {
  id: string;
  tipo: string;
  estado: string;
  descripcion: string;
  latitud: number;
  longitud: number;
}

interface MapaReportesProps {
  reportes: MarcadorReporte[];
  centro: [number, number];
}

/**
 * Mapa del listado público (Módulo 2) — un marcador por reporte de la página
 * actual, con el ícono Flyweight de iconosReporteFlyweight.ts (compartido
 * por tipo/estado, nunca uno nuevo por marcador).
 */
export function MapaReportes({ reportes, centro }: MapaReportesProps) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-700">
      <MapContainer center={centro} zoom={13} style={{ height: 420, width: '100%' }}>
        <TileLayer
          attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reportes.map((reporte) => (
          <Marker
            key={reporte.id}
            position={[reporte.latitud, reporte.longitud]}
            icon={obtenerIconoReporte(reporte.tipo, reporte.estado)}
          >
            <Popup>
              <span className="font-medium capitalize">{reporte.tipo}</span> · {reporte.estado}
              <br />
              {reporte.descripcion}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
