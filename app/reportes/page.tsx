'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import clsx from 'clsx';
import { TIPOS_REPORTE_SOPORTADOS, type TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';
import { ESTADOS_REPORTE_SOPORTADOS, type EstadoReporte } from '@dominio/entidades/Reporte';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que SelectorUbicacionMapa (app/reportes/nuevo).
const MapaReportes = dynamic(
  () => import('@presentacion/componentes/mapas/MapaReportes').then((mod) => mod.MapaReportes),
  { ssr: false, loading: () => <p className="text-sm text-slate-400">Cargando mapa…</p> },
);

const POR_PAGINA = 50;
const RADIO_CERCA_DE_MI_KM = 10;
const CENTRO_POR_DEFECTO: [number, number] = [-37.9989, -61.3565];

const ETIQUETAS_TIPO: Record<TipoReporte, string> = {
  perdido: 'Perdido',
  encontrado: 'Encontrado',
  problematica: 'Problemática',
};

const ETIQUETAS_ESTADO: Record<EstadoReporte, { texto: string; icono: string }> = {
  reportado: { texto: 'Reportado', icono: '📢' },
  en_revision: { texto: 'En revisión', icono: '🔍' },
  en_atencion: { texto: 'En atención', icono: '🔍' },
  resuelto: { texto: 'Resuelto', icono: '✅' },
  cerrado: { texto: 'Cerrado', icono: '⏹️' },
};

interface ReporteApi {
  id: string;
  tipo: string;
  subtipo: string | null;
  descripcion: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  especie: string | null;
  estado: string;
  createdAt: string;
}

interface RespuestaListado {
  items: ReporteApi[];
  total: number;
  pagina: number;
  porPagina: number;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

type Vista = 'tabla' | 'mapa';

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function badgeEstado(estado: string) {
  const info = ETIQUETAS_ESTADO[estado as EstadoReporte] ?? { texto: estado, icono: '•' };
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true">{info.icono}</span>
      {info.texto}
    </span>
  );
}

/**
 * Listado y mapa de reportes activos (Módulo 2) — vista pública, sin login
 * (GET /api/reportes, RLS reportes_select_publico). Alterna entre tabla
 * (font-mono en fecha/ID) y mapa Leaflet (Flyweight de íconos por
 * tipo/estado — ver MapaReportes.tsx) sin perder los filtros activos:
 * `vista` es un state independiente de tipo/estado/cercaDeMi, así que
 * cambiarla nunca dispara un refetch ni resetea el filtro.
 */
export default function PaginaReportes() {
  const [vista, setVista] = useState<Vista>('tabla');
  const [tipo, setTipo] = useState<TipoReporte | ''>('');
  const [estado, setEstado] = useState<EstadoReporte | ''>('');
  const [cercaDeMi, setCercaDeMi] = useState(false);
  const [posicion, setPosicion] = useState<[number, number] | null>(null);

  const [items, setItems] = useState<ReporteApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);

  const cargarPagina = useCallback(
    async (paginaSolicitada: number) => {
      setCargando(true);
      setErrorCarga(null);
      try {
        const params = new URLSearchParams({ pagina: String(paginaSolicitada), porPagina: String(POR_PAGINA) });
        if (tipo) params.set('tipo', tipo);
        if (estado) params.set('estado', estado);
        if (cercaDeMi && posicion) {
          params.set('latitud', String(posicion[0]));
          params.set('longitud', String(posicion[1]));
          params.set('radioKm', String(RADIO_CERCA_DE_MI_KM));
        }

        const respuesta = await fetch(`/api/reportes?${params.toString()}`);
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json()) as RespuestaError;
          setErrorCarga(cuerpo.mensaje);
          return;
        }
        const datos = (await respuesta.json()) as RespuestaListado;
        setItems(datos.items);
        setTotal(datos.total);
        setPagina(datos.pagina);
      } catch {
        setErrorCarga('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      } finally {
        setCargando(false);
      }
    },
    [tipo, estado, cercaDeMi, posicion],
  );

  useEffect(() => {
    cargarPagina(1);
  }, [cargarPagina]);

  function alternarCercaDeMi() {
    if (cercaDeMi) {
      setCercaDeMi(false);
      setPosicion(null);
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setErrorUbicacion('Tu navegador no puede compartir tu ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicionNavegador) => {
        setErrorUbicacion(null);
        setPosicion([posicionNavegador.coords.latitude, posicionNavegador.coords.longitude]);
        setCercaDeMi(true);
      },
      () => setErrorUbicacion('No pudimos obtener tu ubicación. Probá de nuevo.'),
    );
  }

  function limpiarFiltros() {
    setTipo('');
    setEstado('');
    setCercaDeMi(false);
    setPosicion(null);
  }

  const hayFiltrosActivos = Boolean(tipo || estado || cercaDeMi);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const marcadores = items.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    estado: item.estado,
    descripcion: item.descripcion,
    latitud: item.latitud,
    longitud: item.longitud,
  }));
  const centroMapa: [number, number] = posicion ?? (items[0] ? [items[0].latitud, items[0].longitud] : CENTRO_POR_DEFECTO);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Reportes activos</h1>
      <p className="mb-6 text-sm text-slate-400">
        Mascotas perdidas, encontradas y problemáticas urbanas reportadas por la comunidad.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-tipo" className="text-xs font-medium text-slate-400">
            Tipo
          </label>
          <select
            id="filtro-tipo"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as TipoReporte | '')}
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-estado" className="text-xs font-medium text-slate-400">
            Estado
          </label>
          <select
            id="filtro-estado"
            value={estado}
            onChange={(evento) => setEstado(evento.target.value as EstadoReporte | '')}
            className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Activos</option>
            {ESTADOS_REPORTE_SOPORTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETAS_ESTADO[valor].texto}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={alternarCercaDeMi}
          aria-pressed={cercaDeMi}
          className={clsx(
            'h-11 min-h-[44px] rounded-md border px-4 text-[15px] font-medium',
            cercaDeMi ? 'border-blue-500 bg-blue-500 text-slate-50' : 'border-slate-700 bg-slate-800 text-slate-300',
          )}
        >
          <span aria-hidden="true">📍</span> Cerca de mí
        </button>

        {hayFiltrosActivos ? (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 text-[15px] font-medium text-slate-300"
          >
            Limpiar filtros
          </button>
        ) : null}

        <div className="ml-auto flex gap-2" role="tablist" aria-label="Vista">
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'tabla'}
            onClick={() => setVista('tabla')}
            className={clsx(
              'h-11 min-h-[44px] rounded-md border px-4 text-[15px] font-medium',
              vista === 'tabla' ? 'border-blue-500 bg-blue-500 text-slate-50' : 'border-slate-700 bg-slate-800 text-slate-300',
            )}
          >
            Tabla
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'mapa'}
            onClick={() => setVista('mapa')}
            className={clsx(
              'h-11 min-h-[44px] rounded-md border px-4 text-[15px] font-medium',
              vista === 'mapa' ? 'border-blue-500 bg-blue-500 text-slate-50' : 'border-slate-700 bg-slate-800 text-slate-300',
            )}
          >
            Mapa
          </button>
        </div>
      </div>

      {errorUbicacion ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {errorUbicacion}
        </p>
      ) : null}

      {errorCarga ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {errorCarga}
        </p>
      ) : null}

      {cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}

      {!cargando && !errorCarga && items.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-700 p-8 text-center">
          <p className="mb-1 text-sm font-medium text-slate-50">No encontramos reportes con estos filtros.</p>
          <p className="mb-4 text-sm text-slate-400">
            Probá con otra categoría o estado, o publicá el primer reporte de tu zona.
          </p>
          {hayFiltrosActivos ? (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex h-11 min-h-[44px] items-center rounded-md bg-blue-500 px-4 text-[15px] font-medium text-slate-50"
            >
              Limpiar filtros
            </button>
          ) : (
            <Link
              href="/reportes/nuevo"
              className="inline-flex h-11 min-h-[44px] items-center rounded-md bg-blue-500 px-4 text-[15px] font-medium text-slate-50"
            >
              Publicar un reporte
            </Link>
          )}
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 && vista === 'tabla' ? (
        <div className="overflow-x-auto rounded-md border border-slate-700">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
                <th scope="col" className="px-4 py-3 font-medium">
                  ID
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Descripción
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Reportado el
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-800 last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{item.id}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {ETIQUETAS_TIPO[item.tipo as TipoReporte] ?? item.tipo}
                    {item.especie ? <span className="text-slate-500"> · {item.especie}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{badgeEstado(item.estado)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-300" title={item.descripcion}>
                    {item.descripcion}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{formatearFecha(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 && vista === 'mapa' ? (
        <MapaReportes reportes={marcadores} centro={centroMapa} />
      ) : null}

      {total > POR_PAGINA ? (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <button
            type="button"
            onClick={() => cargarPagina(pagina - 1)}
            disabled={pagina <= 1 || cargando}
            className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="font-mono">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => cargarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas || cargando}
            className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </main>
  );
}
