'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import {
  TIPOS_EVENTO_SOPORTADOS,
  type TipoEvento,
} from '@aplicacion/dtos/municipio/CrearEventoDto';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que MapaReportes/MapaCalorMunicipal.
const MapaEventos = dynamic(
  () => import('@presentacion/componentes/mapas/MapaEventos').then((mod) => mod.MapaEventos),
  { ssr: false, loading: () => <p className="text-sm text-text-muted">Cargando mapa…</p> },
);

const POR_PAGINA = 50;
const CENTRO_POR_DEFECTO: [number, number] = [-37.9989, -61.3565];

const ETIQUETAS_TIPO: Record<TipoEvento, string> = {
  castracion: 'Castración',
  vacunacion: 'Vacunación',
  desparasitacion: 'Desparasitación',
  otro: 'Otro',
};

interface EventoApi {
  id: string;
  municipioId: string;
  titulo: string;
  tipo: string;
  direccion: string;
  latitud: number;
  longitud: number;
  fecha: string;
  cuposTotales: number;
  requisitos: string | null;
}

interface RespuestaListado {
  items: EventoApi[];
  total: number;
  pagina: number;
  porPagina: number;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

type Vista = 'calendario' | 'mapa';

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' });
}

function claveDia(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Agrupa los eventos (ya ordenados por fecha ascendente por la API) en secciones por día — la "vista de calendario" del Paso 2 del ticket. */
function agruparPorDia(items: EventoApi[]): Array<{ dia: string; eventos: EventoApi[] }> {
  const grupos: Array<{ dia: string; eventos: EventoApi[] }> = [];
  for (const item of items) {
    const dia = claveDia(item.fecha);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) {
      ultimo.eventos.push(item);
    } else {
      grupos.push({ dia, eventos: [item] });
    }
  }
  return grupos;
}

/**
 * Calendario público de operativos (Módulo 3) — vista pública, sin login
 * (GET /api/municipio/eventos, RLS eventos_select_publico). Accesible desde
 * '/municipio/eventos' aunque el resto de '/municipio' exija rol
 * municipio/administrador (ver middleware.ts, RUTAS_PAGINA_LECTURA_PUBLICA).
 * Alterna entre agenda por día y mapa Leaflet (Flyweight de íconos por
 * tipo — ver MapaEventos.tsx), igual que /reportes.
 */
export default function PaginaCalendarioEventos() {
  const [vista, setVista] = useState<Vista>('calendario');
  const [tipo, setTipo] = useState<TipoEvento | ''>('');

  const [items, setItems] = useState<EventoApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

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

        const respuesta = await fetch(`/api/municipio/eventos?${params.toString()}`);
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
    [tipo],
  );

  useEffect(() => {
    cargarPagina(1);
  }, [cargarPagina]);

  function limpiarFiltros() {
    setTipo('');
  }

  const hayFiltrosActivos = Boolean(tipo);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const grupos = agruparPorDia(items);
  const marcadores = items.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    tipo: item.tipo,
    direccion: item.direccion,
    fecha: item.fecha,
    latitud: item.latitud,
    longitud: item.longitud,
  }));
  const centroMapa: [number, number] = items[0]
    ? [items[0].latitud, items[0].longitud]
    : CENTRO_POR_DEFECTO;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-text-primary">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Datos y turnos del municipio.png"
          alt="Mascota organizando un calendario de turnos"
          titulo="Calendario de operativos"
          descripcion="Castraciones, vacunaciones y desparasitaciones organizadas por el municipio en Coronel Pringles."
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-tipo-evento" className="text-xs font-medium text-text-muted">
            Tipo
          </label>
          <select
            id="filtro-tipo-evento"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as TipoEvento | '')}
            className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Todos</option>
            {TIPOS_EVENTO_SOPORTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETAS_TIPO[valor]}
              </option>
            ))}
          </select>
        </div>

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
            aria-selected={vista === 'calendario'}
            onClick={() => setVista('calendario')}
            className={clsx(
              'h-11 min-h-[44px] rounded-md border px-4 text-[15px] font-medium',
              vista === 'calendario'
                ? 'border-accent bg-accent text-text-primary'
                : 'border-surface2 bg-surface1 text-text-muted',
            )}
          >
            Calendario
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
            No hay operativos programados con estos filtros.
          </p>
          <p className="text-sm text-text-muted">
            Probá con otro tipo, o volvé a consultar más adelante.
          </p>
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 && vista === 'calendario' ? (
        <div className="flex flex-col gap-6">
          {grupos.map((grupo) => (
            <section key={grupo.dia}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-text-primary">
                {grupo.dia}
              </h2>
              <div className="flex flex-col gap-2">
                {grupo.eventos.map((evento) => (
                  <div
                    key={evento.id}
                    className="rounded-md border border-surface2 bg-surface1/50 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary">{evento.titulo}</p>
                      <span className="font-mono text-xs text-text-muted">
                        {formatearFecha(evento.fecha)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {ETIQUETAS_TIPO[evento.tipo as TipoEvento] ?? evento.tipo} ·{' '}
                      {evento.direccion}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Cupos totales: {evento.cuposTotales}
                    </p>
                    {evento.requisitos ? (
                      <p className="mt-1 text-xs text-text-muted">{evento.requisitos}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 && vista === 'mapa' ? (
        <MapaEventos eventos={marcadores} centro={centroMapa} />
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
