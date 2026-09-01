'use client';

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface PuntoCalor {
  zonaLat: number;
  zonaLng: number;
  total: number;
}

interface MapaCalorMunicipalProps {
  puntos: PuntoCalor[];
  centro: [number, number];
}

// Sin dependencia nueva (`leaflet.heat` no está entre las dependencias del
// proyecto): un círculo por celda de la grilla `zona_lat`/`zona_lng`
// (docs/SCHEMA.md, mv_metricas_reportes_periodo), con radio y opacidad
// proporcionales al total agregado — el mismo efecto visual de "mapa de
// calor" sin sumar un paquete solo para esto.
const RADIO_MINIMO_PX = 8;
const RADIO_MAXIMO_PX = 32;

function radioPara(total: number, totalMaximo: number): number {
  if (totalMaximo <= 0) return RADIO_MINIMO_PX;
  const proporcion = total / totalMaximo;
  return RADIO_MINIMO_PX + proporcion * (RADIO_MAXIMO_PX - RADIO_MINIMO_PX);
}

/**
 * Mapa de calor del dashboard municipal (Módulo 3, Paso 3) — cada punto
 * proviene de una fila ya agregada de `mv_metricas_reportes_periodo`
 * (`zona_lat`/`zona_lng`/`total`), nunca de un reporte individual: este
 * componente no sabe (ni necesita saber) qué reportes puntuales componen
 * cada celda.
 */
export function MapaCalorMunicipal({ puntos, centro }: MapaCalorMunicipalProps) {
  const totalMaximo = Math.max(0, ...puntos.map((p) => p.total));

  return (
    <div className="overflow-hidden rounded-md border border-slate-700">
      <MapContainer center={centro} zoom={12} style={{ height: 420, width: '100%' }}>
        <TileLayer
          attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {puntos.map((punto, indice) => (
          <CircleMarker
            key={`${punto.zonaLat}-${punto.zonaLng}-${indice}`}
            center={[punto.zonaLat, punto.zonaLng]}
            radius={radioPara(punto.total, totalMaximo)}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.45, weight: 1 }}
          >
            <Popup>
              <span className="font-medium">{punto.total}</span> reporte{punto.total === 1 ? '' : 's'} en esta zona
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
