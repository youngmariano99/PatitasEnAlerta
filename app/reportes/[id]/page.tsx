'use client';

import { useParams } from 'next/navigation';
import { LineaTiempoEstadoReporte } from '@presentacion/componentes/reportes/LineaTiempoEstadoReporte';

/**
 * Detalle de un reporte (Módulo 2) — por ahora, acotado a la línea de tiempo
 * de cambios de estado (historia "Historial de cambios de estado de un
 * reporte"). `LineaTiempoEstadoReporte` resuelve por su cuenta la
 * autorización contra GET /api/reportes/{id}/historial (dueño del reporte,
 * municipio o administrador) — esta página no necesita conocer el rol del
 * usuario de antemano.
 */
export default function PaginaDetalleReporte() {
  const params = useParams<{ id: string }>();
  const reporteId = params.id;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Historial del reporte</h1>
      <p className="mb-6 font-mono text-xs text-slate-500">{reporteId}</p>

      <LineaTiempoEstadoReporte reporteId={reporteId} />
    </main>
  );
}
