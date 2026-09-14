'use client';

import { useCallback, useEffect, useState } from 'react';
import { TIPOS_SOLICITUD_RECURSO_SOPORTADOS, type TipoSolicitudRecurso } from '@aplicacion/dtos/red-colaboracion/PublicarSolicitudRecursoDto';

interface MetricasApi {
  totalCompletadas: number;
  porTipo: Record<string, number>;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const ETIQUETAS_TIPO: Record<TipoSolicitudRecurso, string> = {
  transito: 'Tránsito',
  insumos: 'Insumos',
  asistencia_veterinaria: 'Asistencia veterinaria',
  adopcion: 'Adopción',
};

/**
 * "Mis métricas de contribución" (Módulo 5, docs/REQUISITOS.md: "Consultar
 * sus propias métricas de contribución, sin exposición pública comparativa
 * frente a otros usuarios"). Carga GET /api/red-colaboracion/metricas
 * (Paso 1), que agrega exclusivamente `stakeholder_id = usuario_actual()` —
 * esta página nunca pide ni podría pedir datos de otro usuario, no hay
 * ningún id seleccionable en la UI.
 *
 * Deliberadamente SIN ranking, sin promedio general de la red, sin posición
 * relativa a otros usuarios (Paso 2) — solo el total propio y su desglose
 * por tipo, en tarjetas `font-mono` (Paso 3, mismo criterio tipográfico que
 * `docs/PLANIFICACION.md` Sección 5: IDs/fechas/columnas de datos en
 * `font-mono`).
 */
export default function MetricasPropias() {
  const [metricas, setMetricas] = useState<MetricasApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarMetricas = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const respuesta = await fetch('/api/red-colaboracion/metricas');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorCarga(cuerpo.mensaje);
        return;
      }
      setMetricas((await respuesta.json()) as MetricasApi);
    } catch {
      setErrorCarga('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

  const desglose = metricas ? TIPOS_SOLICITUD_RECURSO_SOPORTADOS.map((tipo) => ({ tipo, total: metricas.porTipo[tipo] ?? 0 })) : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Mis métricas de contribución</h1>
      <p className="mb-6 text-sm text-slate-400">
        Tus colaboraciones completadas en la Red de Colaboración. Son datos propios, sin comparación con otros usuarios.
      </p>

      {errorCarga ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {errorCarga}
        </p>
      ) : null}

      {cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}

      {!cargando && !errorCarga && metricas && metricas.totalCompletadas === 0 ? (
        <div className="rounded-md border border-dashed border-slate-700 p-8 text-center">
          <p className="mb-1 text-sm font-medium text-slate-50">Todavía no completaste ninguna colaboración.</p>
          <p className="text-sm text-slate-400">
            Ofrecete como colaborador en una solicitud abierta de la Red de Colaboración para empezar a sumar.
          </p>
        </div>
      ) : null}

      {!cargando && !errorCarga && metricas && metricas.totalCompletadas > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-slate-700 bg-slate-800/50 p-6">
            <p className="text-sm text-slate-400">Colaboraciones completadas</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-slate-50">{metricas.totalCompletadas}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {desglose
              .filter((item) => item.total > 0)
              .map((item) => (
                <div key={item.tipo} className="rounded-md border border-slate-700 bg-slate-800/50 p-4">
                  <p className="text-sm text-slate-400">{ETIQUETAS_TIPO[item.tipo]}</p>
                  <p className="mt-1 font-mono text-xl font-semibold text-slate-50">{item.total}</p>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
