'use client';

import Link from 'next/link';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { PawPrint, TriangleAlert } from 'lucide-react';
import { obtenerIconoReporte } from '@presentacion/componentes/mapas/iconosReporteFlyweight';
import { LeyendaMapa } from '@presentacion/componentes/mapas/LeyendaMapa';

import { optimizarImagenCloudinary, PRESETS_IMAGEN } from '@presentacion/lib/optimizacionImagenes';

const REFERENCIAS = [
  { etiqueta: 'Perdidos (borde rojo)', color: '#B3261E', icono: PawPrint, esFoto: true },
  { etiqueta: 'Encontrados (borde verde)', color: '#0F7B4D', icono: PawPrint, esFoto: true },
  { etiqueta: 'Problemáticas', color: '#C44601', icono: TriangleAlert },
];

export interface MarcadorReporte {
  id: string;
  tipo: string;
  estado: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  especie: string | null;
  fotoUrl?: string | null;
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
              icon={obtenerIconoReporte(reporte.tipo, reporte.estado, reporte.especie, reporte.fotoUrl)}
            >
              <Popup>
                <div style={{ maxWidth: 220 }}>
                  {reporte.fotoUrl ? (
                    <div style={{ width: '100%', height: 110, borderRadius: 6, overflow: 'hidden', marginBottom: 8, background: '#eee' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={optimizarImagenCloudinary(reporte.fotoUrl, PRESETS_IMAGEN.popupMapa)}
                        alt={reporte.descripcion}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                        onError={(e) => {
                          const contenedor = (e.currentTarget as HTMLElement).parentElement;
                          if (contenedor) contenedor.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{reporte.tipo}</span>
                    <span style={{ color: '#666', fontSize: 12 }}>· {reporte.estado}</span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: 13, lineHeight: 1.3, maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {reporte.descripcion}
                  </p>
                  <Link href={`/reportes/${reporte.id}`} style={{ color: '#0073E6', fontSize: 13, textDecoration: 'underline', display: 'inline-block', marginTop: 4 }}>
                    Ver reporte completo →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <LeyendaMapa
        items={REFERENCIAS}
        notaAdicional="Los pines muestran la foto de la mascota o el ícono de su especie (🐕 perro / 🐈 gato) si no tiene foto."
      />
    </div>
  );
}
