'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { TIPOS_COMERCIO_SOPORTADOS } from '@aplicacion/dtos/comercios/RegistrarComercioDto';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que MapaReportes (app/reportes/page.tsx).
const MapaComercios = dynamic(
  () => import('@presentacion/componentes/mapas/MapaComercios').then((mod) => mod.MapaComercios),
  { ssr: false, loading: () => <p className="text-sm text-text-muted">Cargando mapa…</p> },
);

const POR_PAGINA = 10;
const TOPE_CANDIDATOS = 50;
const DEBOUNCE_BUSQUEDA_MS = 300;
const CENTRO_POR_DEFECTO: [number, number] = [-37.9989, -61.3565];

const ETIQUETAS_TIPO: Record<string, string> = {
  pet_shop: 'Pet shop',
  forrajeria: 'Forrajería',
  peluqueria: 'Peluquería',
  farmacia_veterinaria: 'Farmacia veterinaria',
  otro: 'Otro',
};

interface ComercioApi {
  id: string;
  nombreComercio: string;
  tipoComercio: string;
  direccion: string;
  latitud: number;
  longitud: number;
  distanciaKm: number | null;
  createdAt: string;
}

interface RespuestaListado {
  items: ComercioApi[];
  total: number;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

/**
 * UI de búsqueda y mapa de comercios cercanos (Módulo 7, Historia "Búsqueda
 * de comercios y servicios cercanos") — vista pública, sin login
 * (GET /api/comercios/cercanos, RLS `comercios_select_publico`).
 *
 * El texto de búsqueda (`q`, con debounce) viaja al backend (Paso 1:
 * filtro Prisma parametrizado sobre `nombre_comercio`/`tipo_comercio`). El
 * filtro de "Tipo" se aplica en el cliente sobre ese mismo resultado — el
 * ticket solo pide un único parámetro de texto libre en el backend, así que
 * agregar un segundo parámetro estructurado hubiera sido alcance no pedido;
 * dado el volumen de `comercios` de este proyecto (single-tenant, ver
 * docs/SEED.md), pedir hasta `TOPE_CANDIDATOS` resultados y filtrar/paginar
 * en el cliente es la opción más simple sin perder corrección. `items`
 * (ya filtrado) es la ÚNICA fuente de datos para la tabla y el mapa: ambas
 * vistas se actualizan juntas apenas cambia cualquier filtro (AC del ticket).
 */
export function BuscadorComercios() {
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [textoDebounced, setTextoDebounced] = useState('');
  const [tipoComercio, setTipoComercio] = useState('');
  const [pagina, setPagina] = useState(1);

  const [candidatos, setCandidatos] = useState<ComercioApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    const temporizador = setTimeout(
      () => setTextoDebounced(textoBusqueda.trim()),
      DEBOUNCE_BUSQUEDA_MS,
    );
    return () => clearTimeout(temporizador);
  }, [textoBusqueda]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setErrorCarga(null);
      try {
        const params = new URLSearchParams({ pagina: '1', porPagina: String(TOPE_CANDIDATOS) });
        if (textoDebounced) params.set('q', textoDebounced);

        const respuesta = await fetch(`/api/comercios/cercanos?${params.toString()}`);
        if (cancelado) return;
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json()) as RespuestaError;
          setErrorCarga(cuerpo.mensaje);
          return;
        }
        const datos = (await respuesta.json()) as RespuestaListado;
        setCandidatos(datos.items);
      } catch {
        if (!cancelado)
          setErrorCarga(
            'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
          );
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [textoDebounced]);

  useEffect(() => {
    setPagina(1);
  }, [tipoComercio, textoDebounced]);

  const filtrados = useMemo(
    () =>
      tipoComercio ? candidatos.filter((item) => item.tipoComercio === tipoComercio) : candidatos,
    [candidatos, tipoComercio],
  );
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const items = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const marcadores = items.map((item) => ({
    id: item.id,
    nombreComercio: item.nombreComercio,
    tipoComercio: item.tipoComercio,
    direccion: item.direccion,
    latitud: item.latitud,
    longitud: item.longitud,
  }));
  const centroMapa: [number, number] = items[0]
    ? [items[0].latitud, items[0].longitud]
    : CENTRO_POR_DEFECTO;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="buscador-comercios-texto" className="text-xs font-medium text-text-muted">
            Buscar
          </label>
          <input
            id="buscador-comercios-texto"
            type="text"
            placeholder="Nombre o tipo de comercio…"
            value={textoBusqueda}
            onChange={(evento) => setTextoBusqueda(evento.target.value)}
            className="h-11 min-h-[44px] w-64 rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="buscador-comercios-tipo" className="text-xs font-medium text-text-muted">
            Tipo
          </label>
          <select
            id="buscador-comercios-tipo"
            value={tipoComercio}
            onChange={(evento) => setTipoComercio(evento.target.value)}
            className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Todos</option>
            {TIPOS_COMERCIO_SOPORTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETAS_TIPO[valor]}
              </option>
            ))}
          </select>
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
          <p className="text-sm font-medium text-text-primary">
            No encontramos comercios con estos filtros.
          </p>
          <p className="text-sm text-text-muted">Probá con otro texto o tipo de comercio.</p>
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-md border border-surface2">
            <table className="w-full min-w-[420px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-surface2 bg-surface1 text-xs uppercase tracking-wide text-text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Nombre
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Dirección
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-surface2 last:border-b-0">
                    <td className="px-4 py-3 text-text-primary">{item.nombreComercio}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {ETIQUETAS_TIPO[item.tipoComercio] ?? item.tipoComercio}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{item.direccion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <MapaComercios comercios={marcadores} centro={centroMapa} />
        </div>
      ) : null}

      {filtrados.length > POR_PAGINA ? (
        <div className="mt-6 flex items-center justify-between text-sm text-text-muted">
          <button
            type="button"
            onClick={() => setPagina((actual) => actual - 1)}
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
            onClick={() => setPagina((actual) => actual + 1)}
            disabled={pagina >= totalPaginas || cargando}
            className="h-11 min-h-[44px] rounded-md border border-surface2 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}
