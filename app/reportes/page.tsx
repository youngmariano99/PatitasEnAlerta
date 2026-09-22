'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import clsx from 'clsx';
import {
  TIPOS_REPORTE_SOPORTADOS,
  type TipoReporte,
} from '@aplicacion/dtos/reportes/CrearReporteDto';
import { ESTADOS_REPORTE_SOPORTADOS, type EstadoReporte } from '@dominio/entidades/Reporte';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que SelectorUbicacionMapa (app/reportes/nuevo).
const MapaReportes = dynamic(
  () => import('@presentacion/componentes/mapas/MapaReportes').then((mod) => mod.MapaReportes),
  { ssr: false, loading: () => <p className="text-sm text-text-muted">Cargando mapa…</p> },
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
        const params = new URLSearchParams({
          pagina: String(paginaSolicitada),
          porPagina: String(POR_PAGINA),
        });
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
        setErrorCarga(
          'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
        );
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
  const centroMapa: [number, number] =
    posicion ?? (items[0] ? [items[0].latitud, items[0].longitud] : CENTRO_POR_DEFECTO);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-text-primary">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Mapa-Animales-encontrados.png"
          alt="Mascota señalando un punto en el mapa"
          titulo="Reportes activos"
          descripcion="Mascotas perdidas, encontradas y problemáticas urbanas reportadas por la comunidad."
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-tipo" className="text-xs font-medium text-text-muted">
            Tipo
          </label>
          <select
            id="filtro-tipo"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as TipoReporte | '')}
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-estado" className="text-xs font-medium text-text-muted">
            Estado
          </label>
          <select
            id="filtro-estado"
            value={estado}
            onChange={(evento) => setEstado(evento.target.value as EstadoReporte | '')}
            className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
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
            cercaDeMi
              ? 'border-accent bg-accent text-text-primary'
              : 'border-surface2 bg-surface1 text-text-muted',
          )}
        >
          <span aria-hidden="true">📍</span> Cerca de mí
        </button>

        {hayFiltrosActivos ? (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="h-11 min-h-[44px] rounded-md border border-surface2 px-4 text-[15px] font-medium text-text-muted"
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
              vista === 'tabla'
                ? 'border-accent bg-accent text-text-primary'
                : 'border-surface2 bg-surface1 text-text-muted',
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
              vista === 'mapa'
                ? 'border-accent bg-accent text-text-primary'
                : 'border-surface2 bg-surface1 text-text-muted',
            )}
          >
            Mapa
          </button>
        </div>
      </div>

      {errorUbicacion ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {errorUbicacion}
        </p>
      ) : null}

      {errorCarga ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {errorCarga}
        </p>
      ) : null}

      {cargando ? <p className="text-sm text-text-muted">Cargando…</p> : null}

      {!cargando && !errorCarga && items.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface2 p-8 text-center">
          <p className="mb-1 text-sm font-medium text-text-primary">
            No encontramos reportes con estos filtros.
          </p>
          <p className="mb-4 text-sm text-text-muted">
            Probá con otra categoría o estado, o publicá el primer reporte de tu zona.
          </p>
          {hayFiltrosActivos ? (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex h-11 min-h-[44px] items-center rounded-md bg-accent px-4 text-[15px] font-medium text-text-primary"
            >
              Limpiar filtros
            </button>
          ) : (
            <Link
              href="/reportes/nuevo"
              className="inline-flex h-11 min-h-[44px] items-center rounded-md bg-accent px-4 text-[15px] font-medium text-text-primary"
            >
              Publicar un reporte
            </Link>
          )}
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 && vista === 'tabla' ? (
        <div className="overflow-x-auto rounded-md border border-surface2">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-surface2 bg-surface1 text-xs uppercase tracking-wide text-text-muted">
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
                <tr key={item.id} className="border-b border-surface2 last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{item.id}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {ETIQUETAS_TIPO[item.tipo as TipoReporte] ?? item.tipo}
                    {item.especie ? (
                      <span className="text-text-primary"> · {item.especie}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{badgeEstado(item.estado)}</td>
                  <td
                    className="max-w-xs truncate px-4 py-3 text-text-muted"
                    title={item.descripcion}
                  >
                    {item.descripcion}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">
                    {formatearFecha(item.createdAt)}
                  </td>
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
        <div className="mt-6 flex items-center justify-between text-sm text-text-muted">
          <button
            type="button"
            onClick={() => cargarPagina(pagina - 1)}
            disabled={pagina <= 1 || cargando}
            className="h-11 min-h-[44px] rounded-md border border-surface2 px-4 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="h-11 min-h-[44px] rounded-md border border-surface2 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </main>
  );
}
