'use client';

import { useEffect, useState } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { type EstadoReporte } from '@dominio/entidades/Reporte';

const ETIQUETAS_ESTADO: Record<EstadoReporte, { texto: string; icono: string }> = {
  reportado: { texto: 'Reportado', icono: '📢' },
  en_revision: { texto: 'En revisión', icono: '🔍' },
  en_atencion: { texto: 'En atención', icono: '🔍' },
  resuelto: { texto: 'Resuelto', icono: '✅' },
  cerrado: { texto: 'Cerrado', icono: '⏹️' },
};

function etiquetaEstado(estado: string) {
  return ETIQUETAS_ESTADO[estado as EstadoReporte]?.texto ?? estado;
}

function iconoEstado(estado: string) {
  return ETIQUETAS_ESTADO[estado as EstadoReporte]?.icono ?? '•';
}

interface HistorialEstadoItemApi {
  id: string;
  estadoAnterior: string;
  estadoNuevo: string;
  usuarioId: string;
  registradoEn: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

/** Formato explícito día/mes/año + hora — verificación técnica: en `font-mono` en la línea de tiempo. */
function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

interface LineaTiempoEstadoReporteProps {
  reporteId: string;
}

/**
 * Historial de cambios de estado de un reporte (Módulo 2) — GET
 * /api/reportes/{id}/historial, exclusivo del dueño del reporte o de rol
 * municipio/administrador (PEA-SIS-002 si es de otro usuario, PEA-REP-005 si
 * el reporte no existe). El error de la API se muestra en línea (texto +
 * ícono ⚠️, sin `alert()` nativo, docs/ERRORS.md) — nunca se asume que un 403
 * significa "no existe": el mensaje que devuelve el backend ya es el que se
 * puede mostrar tal cual.
 */
export function LineaTiempoEstadoReporte({ reporteId }: LineaTiempoEstadoReporteProps) {
  const [items, setItems] = useState<HistorialEstadoItemApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarHistorial() {
      setCargando(true);
      setError(null);
      try {
        const respuesta = await fetchConSesion(`/api/reportes/${reporteId}/historial`);
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json()) as RespuestaError;
          if (!cancelado) setError(cuerpo.mensaje);
          return;
        }
        const datos = (await respuesta.json()) as HistorialEstadoItemApi[];
        if (!cancelado) setItems(datos);
      } catch {
        if (!cancelado) setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarHistorial();
    return () => {
      cancelado = true;
    };
  }, [reporteId]);

  if (cargando) {
    return <p className="text-sm text-slate-400">Cargando historial…</p>;
  }

  if (error) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-red-500">
        <span aria-hidden="true">⚠️</span>
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-700 p-8 text-center">
        <p className="text-sm text-slate-400">Este reporte todavía no tiene cambios de estado registrados.</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4" aria-label={`Historial de estado del reporte ${reporteId}`}>
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 rounded-md border border-slate-700 bg-slate-800/50 p-4">
          <span aria-hidden="true" className="text-lg leading-none">
            {iconoEstado(item.estadoNuevo)}
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">{etiquetaEstado(item.estadoAnterior)}</span>
              {' → '}
              <span className="font-medium">{etiquetaEstado(item.estadoNuevo)}</span>
            </p>
            <p className="font-mono text-xs text-slate-500">{formatearFecha(item.registradoEn)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
