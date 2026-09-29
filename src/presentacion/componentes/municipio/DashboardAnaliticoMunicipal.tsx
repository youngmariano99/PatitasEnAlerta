'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BarChart, FileText, Map as MapIcon, TriangleAlert, Info } from 'lucide-react';
import { TIPOS_REPORTE_SOPORTADOS, type TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que MapaReportes/SelectorUbicacionMapa.
const MapaCalorMunicipal = dynamic(
  () =>
    import('@presentacion/componentes/mapas/MapaCalorMunicipal').then(
      (mod) => mod.MapaCalorMunicipal,
    ),
  { ssr: false, loading: () => <p className="text-sm text-text-muted">Cargando mapa de calor…</p> },
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

function sumarPor<T>(
  items: T[],
  clave: (item: T) => string,
  valor: (item: T) => number,
): Record<string, number> {
  const acumulado: Record<string, number> = {};
  for (const item of items) {
    const k = clave(item);
    acumulado[k] = (acumulado[k] ?? 0) + valor(item);
  }
  return acumulado;
}

interface BarraDesgloseProps {
  titulo: string;
  icono: React.ReactNode;
  datos: Array<{ etiqueta: string; total: number }>;
}

/** Barra horizontal simple con CSS (sin librería de gráficos) — ancho proporcional al máximo del grupo. */
function BarraDesglose({ titulo, icono, datos }: BarraDesgloseProps) {
  const maximo = Math.max(1, ...datos.map((d) => d.total));

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 text-base font-semibold text-text-primary flex items-center gap-2">
        {icono} {titulo}
      </h3>
      {datos.length === 0 ? (
        <p className="text-sm text-text-muted mt-auto mb-auto text-center py-4">Sin datos para este período.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {datos.map((d) => (
            <div key={d.etiqueta} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs font-medium text-text-muted truncate" title={d.etiqueta}>{d.etiqueta}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(d.total / maximo) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold text-text-primary">
                {d.total}
              </span>
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
 * materializadas.
 */
export function DashboardAnaliticoMunicipal() {
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  const [tipoReporte, setTipoReporte] = useState<TipoReporte | ''>('problematica');

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

  // Cálculos MoM simulados de acuerdo al requerimiento visual 
  // (Idealmente esto viene del backend con los datos del mes anterior, pero lo aproximamos dinámicamente)
  const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  let reportesActuales = metricasReportes;
  let reportesAnteriores: MetricaReporteApi[] = [];
  
  if (!periodoDesde && !periodoHasta) {
      reportesActuales = metricasReportes.filter(m => new Date(m.periodo) >= hace30dias);
      reportesAnteriores = metricasReportes.filter(m => new Date(m.periodo) < hace30dias);
  }

  const calcularMoM = (actual: number, anterior: number) => {
    if (anterior === 0) return { pct: actual > 0 ? '+100%' : '0%', up: actual >= 0 };
    const dif = ((actual - anterior) / anterior) * 100;
    return { pct: `${dif > 0 ? '+' : ''}${dif.toFixed(1)}%`, up: dif >= 0 };
  };

  const totalReportes = reportesActuales.reduce((acc, m) => acc + m.total, 0);
  const totalReportesAnterior = reportesAnteriores.reduce((acc, m) => acc + m.total, 0);
  const momReportes = calcularMoM(totalReportes, totalReportesAnterior);

  const perdidos = reportesActuales.filter(m => m.tipo === 'perdido').reduce((acc, m) => acc + m.total, 0);
  const perdidosAnterior = reportesAnteriores.filter(m => m.tipo === 'perdido').reduce((acc, m) => acc + m.total, 0);
  const momPerdidos = calcularMoM(perdidos, perdidosAnterior);

  const encontrados = reportesActuales.filter(m => m.tipo === 'encontrado').reduce((acc, m) => acc + m.total, 0);
  const encontradosAnterior = reportesAnteriores.filter(m => m.tipo === 'encontrado').reduce((acc, m) => acc + m.total, 0);
  const momEncontrados = calcularMoM(encontrados, encontradosAnterior);

  const problematicas = reportesActuales.filter(m => m.tipo === 'problematica').reduce((acc, m) => acc + m.total, 0);
  const problematicasAnterior = reportesAnteriores.filter(m => m.tipo === 'problematica').reduce((acc, m) => acc + m.total, 0);
  const momProblematicas = calcularMoM(problematicas, problematicasAnterior);

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
    <section className="mb-12">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-periodo-desde" className="text-xs font-medium text-text-muted">
            Desde
          </label>
          <input
            id="dashboard-periodo-desde"
            type="date"
            value={periodoDesde}
            onChange={(evento) => setPeriodoDesde(evento.target.value)}
            className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-periodo-hasta" className="text-xs font-medium text-text-muted">
            Hasta
          </label>
          <input
            id="dashboard-periodo-hasta"
            type="date"
            value={periodoHasta}
            onChange={(evento) => setPeriodoHasta(evento.target.value)}
            className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-tipo" className="text-xs font-medium text-text-muted">
            Tipo de reporte
          </label>
          <select
            id="dashboard-tipo"
            value={tipoReporte}
            onChange={(evento) => setTipoReporte(evento.target.value as TipoReporte | '')}
            className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Todos</option>
            {TIPOS_REPORTE_SOPORTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETAS_TIPO[valor]}
              </option>
            ))}
          </select>
        </div>

        {periodoDesde && periodoHasta ? (
          <a
            href={`/api/municipio/dashboard/exportar?periodoDesde=${new Date(periodoDesde).toISOString()}&periodoHasta=${new Date(periodoHasta).toISOString()}`}
            className="inline-flex h-11 min-h-[44px] items-center rounded-md border border-surface2 px-4 text-[15px] font-medium text-text-muted"
          >
            Exportar CSV
          </a>
        ) : (
          <span className="text-xs text-text-primary flex items-center gap-1.5">
            <Info className="h-4 w-4" /> Elegí &quot;Desde&quot; y &quot;Hasta&quot; para exportar el resumen a CSV.
          </span>
        )}
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <TriangleAlert className="h-4 w-4" />
          {error}
        </p>
      ) : null}

      {cargando ? <p className="text-sm text-text-muted">Cargando métricas…</p> : null}

      {!cargando && !error ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1 */}
            <div className="flex flex-col justify-center rounded-xl border border-surface2 bg-surface1 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-mono text-3xl font-bold text-text-primary">{totalReportes}</p>
                  <p className="text-sm font-medium text-text-muted">Reportes recibidos</p>
                  <p className={`text-xs mt-1 font-medium ${momReportes.up ? 'text-accent' : 'text-danger'}`}>
                    {momReportes.pct} vs. mes anterior
                  </p>
                </div>
              </div>
            </div>
            
            {/* KPI 2 */}
            <div className="flex flex-col justify-center rounded-xl border border-surface2 bg-surface1 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <TriangleAlert className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-mono text-3xl font-bold text-text-primary">
                    {perdidos}
                  </p>
                  <p className="text-sm font-medium text-text-muted">Animales perdidos</p>
                  <p className={`text-xs mt-1 font-medium ${momPerdidos.up ? 'text-danger' : 'text-accent'}`}>
                    {momPerdidos.pct} vs. mes anterior
                  </p>
                </div>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="flex flex-col justify-center rounded-xl border border-surface2 bg-surface1 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <MapIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-mono text-3xl font-bold text-text-primary">
                    {encontrados}
                  </p>
                  <p className="text-sm font-medium text-text-muted">Animales encontrados</p>
                  <p className={`text-xs mt-1 font-medium ${momEncontrados.up ? 'text-accent' : 'text-danger'}`}>
                    {momEncontrados.pct} vs. mes anterior
                  </p>
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="flex flex-col justify-center rounded-xl border border-surface2 bg-surface1 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f59e0b]/20 text-[#f59e0b]">
                  <TriangleAlert className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-mono text-3xl font-bold text-text-primary">
                    {problematicas}
                  </p>
                  <p className="text-sm font-medium text-text-muted">Problemáticas</p>
                  <p className={`text-xs mt-1 font-medium ${momProblematicas.up ? 'text-[#f59e0b]' : 'text-accent'}`}>
                    {momProblematicas.pct} vs. mes anterior
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-surface2 bg-surface1 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-accent" /> Actividad en el mapa
              </h3>
            </div>
            {puntosCalor.length === 0 ? (
              <div className="rounded-md border border-dashed border-surface2 p-8 text-center">
                <p className="text-sm text-text-muted">
                  No hay reportes para graficar en este período.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-surface2">
                <MapaCalorMunicipal puntos={puntosCalor} centro={CENTRO_POR_DEFECTO} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-surface2 bg-surface1 p-5 shadow-sm">
              <BarraDesglose
                titulo="Reportes por tipo"
                icono={<BarChart className="h-5 w-5 text-text-muted" />}
                datos={Object.entries(reportesPorTipo).map(([etiqueta, total]) => ({
                  etiqueta: ETIQUETAS_TIPO[etiqueta as TipoReporte] ?? etiqueta,
                  total,
                }))}
              />
            </div>
            <div className="rounded-xl border border-surface2 bg-surface1 p-5 shadow-sm">
              <BarraDesglose
                titulo="Reportes por estado"
                icono={<FileText className="h-5 w-5 text-text-muted" />}
                datos={Object.entries(reportesPorEstado).map(([etiqueta, total]) => ({
                  etiqueta,
                  total,
                }))}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
