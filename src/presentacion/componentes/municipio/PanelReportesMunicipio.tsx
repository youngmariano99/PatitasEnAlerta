'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@presentacion/componentes/ui/Badge';
import { optimizarImagenCloudinary, PRESETS_IMAGEN } from '@presentacion/lib/optimizacionImagenes';
import { 
  Filter, CheckCircle, Calendar, Grid, Map as MapIcon, 
  AlertCircle, Loader2, ImageOff, Clock, ExternalLink, 
  ChevronLeft, ChevronRight, CheckCircle2, Clock3
} from 'lucide-react';
import {
  TIPOS_REPORTE_SOPORTADOS,
  type TipoReporte,
} from '@aplicacion/dtos/reportes/CrearReporteDto';
import { ESTADOS_REPORTE_SOPORTADOS, type EstadoReporte } from '@dominio/entidades/Reporte';
import { ReporteEstado } from '@dominio/estados/ReporteEstado';

const MapaReportes = dynamic(
  () => import('@presentacion/componentes/mapas/MapaReportes').then((mod) => mod.MapaReportes),
  { ssr: false, loading: () => <p className="text-sm text-text-muted">Cargando mapa…</p> },
);

const POR_PAGINA = 50;
const ROLES_CON_CONTROL_DE_ESTADO = ['municipio', 'administrador'];

const ETIQUETAS_TIPO: Record<TipoReporte, string> = {
  perdido: 'Perdido',
  encontrado: 'Encontrado',
  problematica: 'Problemática',
};

const ETIQUETAS_ESTADO: Record<EstadoReporte, { texto: string; icono: React.ReactNode }> = {
  reportado: { texto: 'Reportado', icono: <AlertCircle className="h-4 w-4" /> },
  en_revision: { texto: 'En revisión', icono: <Clock3 className="h-4 w-4" /> },
  en_atencion: { texto: 'En atención', icono: <Loader2 className="h-4 w-4" /> },
  atendido: { texto: 'Atendido', icono: <CheckCircle2 className="h-4 w-4" /> },
  resuelto: { texto: 'Resuelto', icono: <CheckCircle2 className="h-4 w-4" /> },
  cerrado: { texto: 'Cerrado', icono: <CheckCircle className="h-4 w-4" /> },
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

function badgeEstado(estado: string, tipo?: string) {
  const info = ETIQUETAS_ESTADO[estado as EstadoReporte] ?? { texto: estado, icono: <AlertCircle className="h-4 w-4" /> };
  const textoReal = estado === 'resuelto' && tipo === 'problematica' ? 'Atendido' : info.texto;
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
      <span aria-hidden="true" className="text-accent">{info.icono}</span>
      {textoReal}
    </span>
  );
}

interface ControlCambioEstadoProps {
  reporte: ReporteApi;
  onCambiar: (id: string, estadoNuevo: EstadoReporte) => Promise<void>;
}

/** Selector + confirmación, acotado a las transiciones válidas desde el estado actual (PEA-REP-006, "mostrar solo las transiciones válidas"). */
function ControlCambioEstado({ reporte, onCambiar }: ControlCambioEstadoProps) {
  const transicionesValidas = ReporteEstado.desde(
    reporte.estado as EstadoReporte,
  ).transicionesValidas;
  const [seleccion, setSeleccion] = useState<EstadoReporte | ''>('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (transicionesValidas.length === 0) {
    return <span className="text-xs text-text-primary">Sin transiciones disponibles</span>;
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
          className="h-9 min-h-[36px] rounded-md border border-surface2 bg-surface1 px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
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
          className="h-9 min-h-[36px] rounded-md bg-accent px-3 text-xs font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
      {error ? (
        <p className="flex items-center gap-1 text-xs text-danger">
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

  // Por defecto, mostrar solo problemáticas en estado reportado
  const [tipo, setTipo] = useState<TipoReporte | ''>('problematica');
  const [estado, setEstado] = useState<EstadoReporte | ''>('reportado');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [items, setItems] = useState<ReporteApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [vista, setVista] = useState<'lista' | 'mapa'>('lista');

  const cargarPagina = useCallback(
    async (paginaSolicitada: number) => {
      setCargando(true);
      setErrorCarga(null);
      try {
        const params = new URLSearchParams({
          pagina: String(vista === 'mapa' ? 1 : paginaSolicitada),
          porPagina: String(vista === 'mapa' ? 1000 : POR_PAGINA),
        });
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
        setErrorCarga(
          'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
        );
      } finally {
        setCargando(false);
      }
    },
    [tipo, estado, fechaDesde, fechaHasta, vista],
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
    setItems((actuales) =>
      actuales.map((item) => (item.id === id ? { ...item, estado: estadoNuevo } : item)),
    );
  }

  const hayFiltrosActivos = Boolean(tipo || estado || fechaDesde || fechaHasta);
  const totalPaginas = Math.max(1, Math.ceil(total / (vista === 'mapa' ? 1000 : POR_PAGINA)));

  // Preparar marcadores para el mapa
  const marcadores = items.map((item) => ({
    id: item.id,
    tipo: item.tipo as TipoReporte,
    estado: item.estado as EstadoReporte,
    especie: item.especie,
    latitud: item.latitud,
    longitud: item.longitud,
    fotoUrl: item.fotoUrl,
    descripcion: item.descripcion,
  }));

  // Centro aproximado de la ciudad
  const centroMapa: [number, number] = [-37.9833, -61.35];

  return (
    <div>
      <div className="mb-6 rounded-xl border border-surface2 bg-surface1 p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label htmlFor="filtro-tipo" className="text-xs font-medium text-text-muted flex items-center gap-1">
              <Filter className="h-3 w-3" /> Tipo
            </label>
            <select
              id="filtro-tipo"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value as TipoReporte | '')}
              className="h-11 min-h-[44px] w-full rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Todos los tipos</option>
              {TIPOS_REPORTE_SOPORTADOS.map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETAS_TIPO[valor]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label htmlFor="filtro-estado" className="text-xs font-medium text-text-muted flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Estado
            </label>
            <select
              id="filtro-estado"
              value={estado}
              onChange={(evento) => setEstado(evento.target.value as EstadoReporte | '')}
              className="h-11 min-h-[44px] w-full rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Todos los activos</option>
              {ESTADOS_REPORTE_SOPORTADOS.map((valor) => (
                <option key={valor} value={valor}>
                  {valor === 'resuelto' && tipo === 'problematica' ? 'Atendido' : ETIQUETAS_ESTADO[valor].texto}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label htmlFor="filtro-fecha-desde" className="text-xs font-medium text-text-muted flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Desde
            </label>
            <input
              id="filtro-fecha-desde"
              type="date"
              value={fechaDesde}
              onChange={(evento) => setFechaDesde(evento.target.value)}
              className="h-11 min-h-[44px] w-full rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label htmlFor="filtro-fecha-hasta" className="text-xs font-medium text-text-muted flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Hasta
            </label>
            <input
              id="filtro-fecha-hasta"
              type="date"
              value={fechaHasta}
              onChange={(evento) => setFechaHasta(evento.target.value)}
              className="h-11 min-h-[44px] w-full rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {hayFiltrosActivos ? (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="h-11 min-h-[44px] rounded-md border border-surface2 px-4 text-[15px] font-medium text-text-muted hover:bg-surface2 transition-colors"
            >
              Limpiar
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center border-b border-surface2 pb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Mostrando {total} resultados
        </h3>
        <div className="flex rounded-md border border-surface2 p-1">
          <button
            type="button"
            onClick={() => setVista('lista')}
            className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${vista === 'lista' ? 'bg-surface2 text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
          >
            <Grid className="h-4 w-4" /> Tarjetas
          </button>
          <button
            type="button"
            onClick={() => setVista('mapa')}
            className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${vista === 'mapa' ? 'bg-surface2 text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
          >
            <MapIcon className="h-4 w-4" /> Mapa
          </button>
        </div>
      </div>

      {errorCarga ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {errorCarga}
        </p>
      ) : null}

      {cargando ? <p className="text-sm text-text-muted py-8 text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin h-4 w-4"/> Cargando reportes…</p> : null}

      {!cargando && !errorCarga && items.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface2 p-12 text-center">
          <p className="mb-2 text-base font-medium text-text-primary">
            No encontramos reportes con estos filtros.
          </p>
          <p className="mb-6 text-sm text-text-muted">
            Probá con otra combinación de fechas, estado o tipo.
          </p>
          {hayFiltrosActivos ? (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex h-11 min-h-[44px] items-center rounded-md bg-accent px-4 text-[15px] font-medium text-text-primary"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 && vista === 'lista' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-surface2 bg-surface1 shadow-sm">
              <div className="relative aspect-[4/3] w-full bg-surface2">
                {item.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={optimizarImagenCloudinary(item.fotoUrl, PRESETS_IMAGEN.galeria)}
                    alt={item.descripcion}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface2 text-surface3" aria-hidden="true">
                    <ImageOff className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <Badge tono={item.tipo === 'perdido' ? 'peligro' : item.tipo === 'encontrado' ? 'exito' : 'alerta'}>
                    {ETIQUETAS_TIPO[item.tipo as TipoReporte] ?? item.tipo}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text-primary">
                    {item.especie ?? 'Reporte general'}
                  </span>
                  {badgeEstado(item.estado, item.tipo)}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-text-muted line-clamp-3 flex-1">
                  {item.descripcion}
                </p>
                <div className="mt-auto border-t border-surface2 pt-4">
                  <div className="mb-3 flex items-center gap-2 text-xs text-text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    {formatearFecha(item.createdAt)}
                  </div>
                  {puedeCambiarEstado && item.tipo === 'problematica' && (
                    <ControlCambioEstado reporte={item} onCambiar={cambiarEstado} />
                  )}
                  <a href={`/reportes/${item.id}`} className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-accent hover:underline w-full rounded-md border border-surface2 py-2">
                    <ExternalLink className="h-4 w-4"/> Ver detalle completo
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 && vista === 'mapa' ? (
        <div className="overflow-hidden rounded-xl border border-surface2 shadow-sm">
          <MapaReportes reportes={marcadores} centro={centroMapa} />
        </div>
      ) : null}

      {total > POR_PAGINA ? (
        <div className="mt-8 flex items-center justify-between border-t border-surface2 pt-6 text-sm text-text-muted">
          <button
            type="button"
            onClick={() => cargarPagina(pagina - 1)}
            disabled={pagina <= 1 || cargando}
            className="flex h-11 items-center gap-2 rounded-md border border-surface2 px-4 transition-colors hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4"/> Anterior
          </button>
          <span className="font-medium text-text-primary">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => cargarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas || cargando}
            className="flex h-11 items-center gap-2 rounded-md border border-surface2 px-4 transition-colors hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente <ChevronRight className="h-4 w-4"/>
          </button>
        </div>
      ) : null}
    </div>
  );
}
