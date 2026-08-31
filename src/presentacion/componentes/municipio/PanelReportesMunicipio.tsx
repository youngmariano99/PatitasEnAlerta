'use client';

import { useCallback, useEffect, useState } from 'react';
import { TIPOS_REPORTE_SOPORTADOS, type TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';
import { ESTADOS_REPORTE_SOPORTADOS, TRANSICIONES_VALIDAS_REPORTE, type EstadoReporte } from '@dominio/entidades/Reporte';

const POR_PAGINA = 50;
const ROLES_CON_CONTROL_DE_ESTADO = ['municipio', 'administrador'];

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

interface ControlCambioEstadoProps {
  reporte: ReporteApi;
  onCambiar: (id: string, estadoNuevo: EstadoReporte) => Promise<void>;
}

/** Selector + confirmación, acotado a las transiciones válidas desde el estado actual (PEA-REP-006, "mostrar solo las transiciones válidas"). */
function ControlCambioEstado({ reporte, onCambiar }: ControlCambioEstadoProps) {
  const transicionesValidas = TRANSICIONES_VALIDAS_REPORTE[reporte.estado as EstadoReporte] ?? [];
  const [seleccion, setSeleccion] = useState<EstadoReporte | ''>('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (transicionesValidas.length === 0) {
    return <span className="text-xs text-slate-500">Sin transiciones disponibles</span>;
  }

  async function confirmar() {
    if (!seleccion) return;
    setEnviando(true);
    setError(null);
    try {
      await onCambiar(reporte.id, seleccion);
      setSeleccion('');
    } catch (excepcion) {
      setError(excepcion instanceof Error ? excepcion.message : 'No pudimos actualizar el estado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select
          aria-label={`Cambiar estado del reporte ${reporte.id}`}
          value={seleccion}
          onChange={(evento) => setSeleccion(evento.target.value as EstadoReporte | '')}
          disabled={enviando}
          className="h-9 min-h-[36px] rounded-md border border-slate-700 bg-slate-800 px-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Cambiar a…</option>
          {transicionesValidas.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETAS_ESTADO[valor].texto}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={confirmar}
          disabled={!seleccion || enviando}
          className="h-9 min-h-[36px] rounded-md bg-blue-500 px-3 text-xs font-medium text-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface PanelReportesMunicipioProps {
  /** Rol del usuario autenticado — el control de cambio de estado solo se renderiza para municipio/administrador (verificación técnica del ticket). */
  rol: string;
}

/**
 * Panel municipal de reportes activos (Módulo 2): reutiliza GET /api/reportes
 * (mismo endpoint que la tabla pública) sumando el control de cambio de
 * estado (PATCH /api/reportes/{id}/estado), visible únicamente cuando `rol`
 * es 'municipio' o 'administrador' — la ruta /municipio/dashboard ya está
 * gateada por rol en middleware.ts, pero este componente hace su propia
 * verificación además (defensa en profundidad, y lo que hace testeable el
 * criterio "un dueño no puede ver el control" sin pasar por el middleware).
 * Filtros tipo + estado + rango de fechas, combinados server-side.
 */
export function PanelReportesMunicipio({ rol }: PanelReportesMunicipioProps) {
  const puedeCambiarEstado = ROLES_CON_CONTROL_DE_ESTADO.includes(rol);

  const [tipo, setTipo] = useState<TipoReporte | ''>('');
  const [estado, setEstado] = useState<EstadoReporte | ''>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [items, setItems] = useState<ReporteApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarPagina = useCallback(
    async (paginaSolicitada: number) => {
      setCargando(true);
      setErrorCarga(null);
      try {
        const params = new URLSearchParams({ pagina: String(paginaSolicitada), porPagina: String(POR_PAGINA) });
        if (tipo) params.set('tipo', tipo);
        if (estado) params.set('estado', estado);
        if (fechaDesde) params.set('fechaDesde', new Date(fechaDesde).toISOString());
        if (fechaHasta) params.set('fechaHasta', new Date(fechaHasta).toISOString());

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
    [tipo, estado, fechaDesde, fechaHasta],
  );

  useEffect(() => {
    cargarPagina(1);
  }, [cargarPagina]);

  function limpiarFiltros() {
    setTipo('');
    setEstado('');
    setFechaDesde('');
    setFechaHasta('');
  }

  async function cambiarEstado(id: string, estadoNuevo: EstadoReporte) {
    const respuesta = await fetch(`/api/reportes/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: estadoNuevo }),
    });
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json()) as RespuestaError;
      throw new Error(cuerpo.mensaje);
    }
    setItems((actuales) => actuales.map((item) => (item.id === id ? { ...item, estado: estadoNuevo } : item)));
  }

  const hayFiltrosActivos = Boolean(tipo || estado || fechaDesde || fechaHasta);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div>
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-fecha-desde" className="text-xs font-medium text-slate-400">
            Desde
          </label>
          <input
            id="filtro-fecha-desde"
            type="date"
            value={fechaDesde}
            onChange={(evento) => setFechaDesde(evento.target.value)}
            className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-fecha-hasta" className="text-xs font-medium text-slate-400">
            Hasta
          </label>
          <input
            id="filtro-fecha-hasta"
            type="date"
            value={fechaHasta}
            onChange={(evento) => setFechaHasta(evento.target.value)}
            className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {hayFiltrosActivos ? (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 text-[15px] font-medium text-slate-300"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

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
          <p className="mb-4 text-sm text-slate-400">Probá con otra combinación de tipo, estado o rango de fechas.</p>
          {hayFiltrosActivos ? (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex h-11 min-h-[44px] items-center rounded-md bg-blue-500 px-4 text-[15px] font-medium text-slate-50"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-700">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
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
                {puedeCambiarEstado ? (
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cambiar estado
                  </th>
                ) : null}
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
                  {puedeCambiarEstado ? (
                    <td className="px-4 py-3">
                      <ControlCambioEstado reporte={item} onCambiar={cambiarEstado} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
