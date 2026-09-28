'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LineaTiempoEstadoReporte } from '@presentacion/componentes/reportes/LineaTiempoEstadoReporte';
import { Badge } from '@presentacion/componentes/ui/Badge';
import { TONO_POR_TIPO_REPORTE } from '@presentacion/config/tonosReporte';
import { optimizarImagenCloudinary, PRESETS_IMAGEN } from '@presentacion/lib/optimizacionImagenes';
import type { TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';
import type { EstadoReporte } from '@dominio/entidades/Reporte';

interface ReporteDetalle {
  id: string;
  tipo: TipoReporte;
  subtipo: string | null;
  descripcion: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  especie: string | null;
  estado: EstadoReporte;
  createdAt: string;
}

const ETIQUETAS_TIPO: Record<string, string> = {
  perdido: 'Perdido',
  encontrado: 'Encontrado',
  problematica: 'Problemática',
};

const ETIQUETAS_ESTADO: Record<string, { texto: string; icono: string }> = {
  reportado: { texto: 'Reportado', icono: '📢' },
  en_revision: { texto: 'En revisión', icono: '🔍' },
  en_atencion: { texto: 'En atención', icono: '🔍' },
  resuelto: { texto: 'Resuelto', icono: '✅' },
  cerrado: { texto: 'Cerrado', icono: '⏹️' },
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });
}

export default function PaginaDetalleReporte() {
  const params = useParams<{ id: string }>();
  const reporteId = params.id;
  const [reporte, setReporte] = useState<ReporteDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [direccion, setDireccion] = useState<string | null>(null);

  useEffect(() => {
    async function cargarReporte() {
      try {
        const respuesta = await fetch(`/api/reportes/${reporteId}`);
        if (!respuesta.ok) {
          if (respuesta.status === 404) {
            setError('El reporte no existe o fue eliminado.');
          } else {
            setError('Error al cargar los detalles del reporte.');
          }
          return;
        }
        const datos = await respuesta.json();
        setReporte(datos);
      } catch (e) {
        setError('Error de conexión al cargar el reporte.');
      } finally {
        setCargando(false);
      }
    }
    cargarReporte();
  }, [reporteId]);

  useEffect(() => {
    if (reporte) {
      // Intentamos obtener la dirección para mostrarla al usuario
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${reporte.latitud}&lon=${reporte.longitud}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'es' }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            // Recortamos la dirección para que no sea excesivamente larga
            const partes = data.display_name.split(',');
            setDireccion(partes.slice(0, 3).join(',').trim());
          }
        })
        .catch(() => {
          // Si falla, silenciosamente no mostramos la dirección, no es bloqueante.
        });
    }
  }, [reporte]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-text-primary">
      {cargando ? (
        <p className="text-text-muted">Cargando detalles...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : reporte ? (
        <>
          <div className="mb-10 overflow-hidden rounded-xl border border-surface2 bg-surface1">
            {reporte.fotoUrl ? (
              <div className="relative aspect-video w-full bg-surface2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optimizarImagenCloudinary(reporte.fotoUrl, PRESETS_IMAGEN.galeria)}
                  alt="Foto del reporte"
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge tono={TONO_POR_TIPO_REPORTE[reporte.tipo] ?? 'neutro'}>
                  {ETIQUETAS_TIPO[reporte.tipo] ?? reporte.tipo}
                </Badge>
                {reporte.especie ? (
                  <span className="text-sm font-medium text-text-muted">{reporte.especie}</span>
                ) : null}
                <span className="ml-auto flex items-center gap-1.5 text-sm font-medium text-text-muted">
                  <span aria-hidden="true">{ETIQUETAS_ESTADO[reporte.estado]?.icono ?? '•'}</span>
                  {ETIQUETAS_ESTADO[reporte.estado]?.texto ?? reporte.estado}
                </span>
              </div>
              <p className="mb-6 whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary">
                {reporte.descripcion}
              </p>
              <div className="flex flex-col gap-2 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">📅</span>
                  <time dateTime={reporte.createdAt}>{formatearFecha(reporte.createdAt)}</time>
                </div>
                {direccion && (
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">📍</span>
                    <span>{direccion}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <h2 className="mb-6 text-xl font-semibold">Historial del reporte</h2>
          <LineaTiempoEstadoReporte reporteId={reporteId} />
        </>
      ) : null}
    </main>
  );
}
