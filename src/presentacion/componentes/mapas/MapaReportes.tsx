'use client';

import Link from 'next/link';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PawPrint, TriangleAlert } from 'lucide-react';
import { obtenerIconoReporte } from '@presentacion/componentes/mapas/iconosReporteFlyweight';
import { LeyendaMapa } from '@presentacion/componentes/mapas/LeyendaMapa';

const REFERENCIAS = [
  { etiqueta: 'Perdidos', color: '#B3261E', icono: PawPrint },
  { etiqueta: 'Encontrados', color: '#0F7B4D', icono: PawPrint },
  { etiqueta: 'Problemáticas', color: '#C44601', icono: TriangleAlert },
];

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
    <div>
      <div className="overflow-hidden rounded-md border border-surface2">
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
                <br />
                <Link href={`/reportes/${reporte.id}`} className="text-accent underline">
                  Ver historial
                </Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <LeyendaMapa items={REFERENCIAS} />
    </div>
  );
}
