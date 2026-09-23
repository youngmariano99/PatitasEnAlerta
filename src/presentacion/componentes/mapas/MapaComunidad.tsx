'use client';

import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PawPrint, CalendarDays } from 'lucide-react';
import { obtenerIconoReporte } from '@presentacion/componentes/mapas/iconosReporteFlyweight';
import { obtenerIconoEvento } from '@presentacion/componentes/mapas/iconosEventoFlyweight';
import { LeyendaMapa } from '@presentacion/componentes/mapas/LeyendaMapa';
import type { MarcadorReporte } from '@presentacion/componentes/mapas/MapaReportes';
import type { MarcadorEvento } from '@presentacion/componentes/mapas/MapaEventos';

type Filtro = 'todos' | 'perdidos' | 'encontrados' | 'operativos';

const FILTROS: Array<{ valor: Filtro; etiqueta: string; colorActivo: string }> = [
  { valor: 'todos', etiqueta: 'Todos', colorActivo: 'border-primary bg-primary text-base' },
  { valor: 'perdidos', etiqueta: 'Perdidos', colorActivo: 'border-danger bg-danger text-base' },
  {
    valor: 'encontrados',
    etiqueta: 'Encontrados',
    colorActivo: 'border-success bg-success text-base',
  },
  { valor: 'operativos', etiqueta: 'Operativos', colorActivo: 'border-accent bg-accent text-base' },
];

const REFERENCIAS = [
  { etiqueta: 'Perdidos', color: '#B3261E', icono: PawPrint },
  { etiqueta: 'Encontrados', color: '#0F7B4D', icono: PawPrint },
  { etiqueta: 'Operativos', color: '#0073E6', icono: CalendarDays },
];

interface MapaComunidadProps {
  reportes: MarcadorReporte[];
  eventos: MarcadorEvento[];
  centro: [number, number];
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Mapa combinado de la home pública — reportes (perdido/encontrado) y
 * operativos municipales en un único mapa, con filtros y referencias de
 * color. No reemplaza a `MapaReportes.tsx` (sigue sirviendo `/reportes`,
 * solo reportes, sin filtros) ni a `MapaEventos.tsx` (sigue sirviendo
 * `/municipio/eventos`) — reutiliza los mismos íconos Flyweight que ambos,
 * sin duplicar esa lógica. El filtrado es 100% client-side sobre los
 * arrays ya fetcheados por la home — no dispara llamadas nuevas.
 */
export function MapaComunidad({ reportes, eventos, centro }: MapaComunidadProps) {
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const muestraReportes = filtro === 'todos' || filtro === 'perdidos' || filtro === 'encontrados';
  const muestraOperativos = filtro === 'todos' || filtro === 'operativos';
  const reportesFiltrados = reportes.filter((reporte) => {
    if (!muestraReportes) return false;
    if (filtro === 'perdidos') return reporte.tipo === 'perdido';
    if (filtro === 'encontrados') return reporte.tipo === 'encontrado';
    return true;
  });

  return (
    <div>
      <div role="group" aria-label="Filtrar el mapa" className="mb-3 flex flex-wrap gap-2">
        {FILTROS.map((item) => {
          const activo = filtro === item.valor;
          return (
            <button
              key={item.valor}
              type="button"
              aria-pressed={activo}
              onClick={() => setFiltro(item.valor)}
              className={clsx(
                'h-11 min-h-touch rounded-md border px-4 text-[15px] font-medium',
                activo
                  ? item.colorActivo
                  : 'border-surface2 bg-surface1 text-text-muted hover:text-text-primary',
              )}
            >
              {item.etiqueta}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-md border border-surface2">
        <MapContainer center={centro} zoom={13} className="h-72 w-full sm:h-96 lg:h-[420px]">
          <TileLayer
            attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {reportesFiltrados.map((reporte) => (
            <Marker
              key={`reporte-${reporte.id}`}
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
          {muestraOperativos
            ? eventos.map((evento) => (
                <Marker
                  key={`evento-${evento.id}`}
                  position={[evento.latitud, evento.longitud]}
                  icon={obtenerIconoEvento(evento.tipo)}
                >
                  <Popup>
                    <span className="font-medium">{evento.titulo}</span>
                    <br />
                    {formatearFecha(evento.fecha)}
                    <br />
                    {evento.direccion}
                  </Popup>
                </Marker>
              ))
            : null}
        </MapContainer>
      </div>

      <LeyendaMapa items={REFERENCIAS} />
    </div>
  );
}
