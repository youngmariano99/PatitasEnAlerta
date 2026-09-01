'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TIPOS_REPORTE_SOPORTADOS, type TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que MapaReportes/SelectorUbicacionMapa.
const MapaCalorMunicipal = dynamic(
  () => import('@presentacion/componentes/mapas/MapaCalorMunicipal').then((mod) => mod.MapaCalorMunicipal),
  { ssr: false, loading: () => <p className="text-sm text-slate-400">Cargando mapa de calor…</p> },
);

const CENTRO_POR_DEFECTO: [number, number] = [-37.9989, -61.3565];

const ETIQUETAS_TIPO: Record<TipoReporte, string> = {
  perdido: 'Perdido',
  encontrado: 'Encontrado',
  problematica: 'Problemática',
};

interface MetricaReporteApi {
  periodo: string;
  tipo: string;
  estado: string;
  zonaLat: number;
  zonaLng: number;
  total: number;
}

interface MetricaTurnoApi {
  periodo: string;
  proveedorTipo: string;
  estado: string;
  total: number;
}

interface DashboardApi {
  metricasReportes: MetricaReporteApi[];
  metricasTurnos: MetricaTurnoApi[];
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

function sumarPor<T>(items: T[], clave: (item: T) => string, valor: (item: T) => number): Record<string, number> {
  const acumulado: Record<string, number> = {};
  for (const item of items) {
    const k = clave(item);
    acumulado[k] = (acumulado[k] ?? 0) + valor(item);
  }
  return acumulado;
}

interface BarraDesgloseProps {
  titulo: string;
  datos: Array<{ etiqueta: string; total: number }>;
}

/** Barra horizontal simple con CSS (sin librería de gráficos) — ancho proporcional al máximo del grupo. */
function BarraDesglose({ titulo, datos }: BarraDesgloseProps) {
  const maximo = Math.max(1, ...datos.map((d) => d.total));

  return (
    <div className="rounded-md border border-slate-700 bg-slate-800/50 p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-50">{titulo}</h3>
      {datos.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos para este período.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {datos.map((d) => (
            <div key={d.etiqueta} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-slate-300">{d.etiqueta}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-700">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${(d.total / maximo) * 100}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-xs text-slate-400">{d.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard analítico municipal (Módulo 3, "Dashboard analítico con mapas
 * de calor"). Consulta GET /api/municipio/dashboard, que a su vez arma la
 * consulta con DashboardMunicipalBuilder exclusivamente sobre las vistas
 * materializadas — este componente nunca pagina/filtra reportes ni turnos
 * individuales, solo trabaja con las filas ya agregadas por período/tipo/
 * zona que la API devuelve.
 */
export function DashboardAnaliticoMunicipal() {
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  const [tipoReporte, setTipoReporte] = useState<TipoReporte | ''>('');

  const [datos, setDatos] = useState<DashboardApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDashboard = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (periodoDesde) params.set('periodoDesde', new Date(periodoDesde).toISOString());
      if (periodoHasta) params.set('periodoHasta', new Date(periodoHasta).toISOString());
      if (tipoReporte) params.set('tipoReporte', tipoReporte);

      const respuesta = await fetch(`/api/municipio/dashboard?${params.toString()}`);
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      setDatos((await respuesta.json()) as DashboardApi);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [periodoDesde, periodoHasta, tipoReporte]);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  const metricasReportes = datos?.metricasReportes ?? [];
  const metricasTurnos = datos?.metricasTurnos ?? [];

  const totalReportes = metricasReportes.reduce((acc, m) => acc + m.total, 0);
  const totalTurnos = metricasTurnos.reduce((acc, m) => acc + m.total, 0);

  const reportesPorTipo = sumarPor(
    metricasReportes,
    (m) => m.tipo,
    (m) => m.total,
  );
  const reportesPorEstado = sumarPor(
    metricasReportes,
    (m) => m.estado,
    (m) => m.total,
  );
  const turnosPorProveedor = sumarPor(
    metricasTurnos,
    (m) => m.proveedorTipo,
    (m) => m.total,
  );

  // El mapa de calor agrupa por celda (zona_lat, zona_lng) sumando todos los
  // períodos/tipos/estados que caen en ella — la densidad geográfica total,
  // no un desglose por semana.
  const puntosCalor = Object.entries(
    sumarPor(
      metricasReportes,
      (m) => `${m.zonaLat}:${m.zonaLng}`,
      (m) => m.total,
    ),
  ).map(([clave, total]) => {
    const [zonaLat, zonaLng] = clave.split(':').map(Number);
    return { zonaLat: zonaLat!, zonaLng: zonaLng!, total };
  });

  return (
    <section className="mt-12">
      <h2 className="mb-1 text-lg font-semibold">Dashboard analítico</h2>
      <p className="mb-6 text-sm text-slate-400">
        Métricas agregadas de reportes y turnos, actualizadas periódicamente (no en tiempo real).
      </p>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-periodo-desde" className="text-xs font-medium text-slate-400">
            Desde
          </label>
          <input
            id="dashboard-periodo-desde"
            type="date"
            value={periodoDesde}
            onChange={(evento) => setPeriodoDesde(evento.target.value)}
            className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-periodo-hasta" className="text-xs font-medium text-slate-400">
            Hasta
          </label>
          <input
            id="dashboard-periodo-hasta"
            type="date"
            value={periodoHasta}
            onChange={(evento) => setPeriodoHasta(evento.target.value)}
            className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-tipo" className="text-xs font-medium text-slate-400">
            Tipo de reporte
          </label>
          <select
            id="dashboard-tipo"
            value={tipoReporte}
            onChange={(evento) => setTipoReporte(evento.target.value as TipoReporte | '')}
            className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {TIPOS_REPORTE_SOPORTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETAS_TIPO[valor]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {cargando ? <p className="text-sm text-slate-400">Cargando métricas…</p> : null}

      {!cargando && !error ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-slate-700 bg-slate-800/50 p-5">
              <p className="text-xs font-medium text-slate-400">Reportes en el período</p>
              <p className="font-mono text-3xl font-semibold text-slate-50">{totalReportes}</p>
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-800/50 p-5">
              <p className="text-xs font-medium text-slate-400">Turnos en el período</p>
              <p className="font-mono text-3xl font-semibold text-slate-50">{totalTurnos}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BarraDesglose
              titulo="Reportes por tipo"
              datos={Object.entries(reportesPorTipo).map(([etiqueta, total]) => ({
                etiqueta: ETIQUETAS_TIPO[etiqueta as TipoReporte] ?? etiqueta,
                total,
              }))}
            />
            <BarraDesglose
              titulo="Reportes por estado"
              datos={Object.entries(reportesPorEstado).map(([etiqueta, total]) => ({ etiqueta, total }))}
            />
          </div>

          <BarraDesglose
            titulo="Turnos por proveedor"
            datos={Object.entries(turnosPorProveedor).map(([etiqueta, total]) => ({ etiqueta, total }))}
          />

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-50">Mapa de calor — densidad de reportes por zona</h3>
            {puntosCalor.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-700 p-8 text-center">
                <p className="text-sm text-slate-400">No hay reportes para graficar en este período.</p>
              </div>
            ) : (
              <MapaCalorMunicipal puntos={puntosCalor} centro={CENTRO_POR_DEFECTO} />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
