'use client';

import { useCallback, useEffect, useState } from 'react';
import { crearClienteSupabaseNavegador } from '@infraestructura/adaptadores/ClienteSupabaseNavegador';

const POR_PAGINA = 50;

interface TurnoApi {
  id: string;
  proveedorTipo: string;
  proveedorId: string;
  eventoId: string | null;
  eventoTitulo: string | null;
  franjaInicio: string;
  franjaFin: string;
  estado: string;
}

interface RespuestaListado {
  items: TurnoApi[];
  total: number;
  pagina: number;
  porPagina: number;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

interface FilaRealtimeTurno {
  id: string;
  proveedor_tipo: string;
  proveedor_id: string;
  evento_id: string | null;
  franja_inicio: string;
  franja_fin: string;
  estado: string;
}

interface ConfiguracionEstado {
  texto: string;
  icono: string;
  clases: string;
}

// Paleta obligatoria del Design System (PLANIFICACION.md Sección 5): solo
// slate/blue/emerald/red. Cada estado se comunica con ícono + texto, nunca
// solo con el color del badge (Paso 3 del ticket).
const ETIQUETAS_ESTADO: Record<string, ConfiguracionEstado> = {
  disponible: { texto: 'Disponible', icono: '🕓', clases: 'border-slate-600 bg-slate-800 text-slate-300' },
  reservado: { texto: 'Reservado', icono: '📅', clases: 'border-blue-500 bg-slate-800 text-blue-400' },
  cancelado: { texto: 'Cancelado', icono: '❌', clases: 'border-red-500 bg-slate-800 text-red-500' },
};

function formatearFranja(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' });
}

/**
 * Traduce una fila cruda del canal Realtime (columnas snake_case de
 * `turnos`) al shape de la API (camelCase). `eventoTitulo` no viaja en la
 * fila de `turnos` (vive en `eventos`, une por `evento_id`) — se conserva el
 * título ya conocido si el turno estaba en pantalla, o queda en `null` si es
 * la primera vez que aparece (ej. se reservó en otra pestaña) hasta la
 * próxima recarga completa.
 */
function filaRealtimeATurno(fila: FilaRealtimeTurno, tituloConocido: string | null): TurnoApi {
  return {
    id: fila.id,
    proveedorTipo: fila.proveedor_tipo,
    proveedorId: fila.proveedor_id,
    eventoId: fila.evento_id,
    eventoTitulo: tituloConocido,
    franjaInicio: fila.franja_inicio,
    franjaFin: fila.franja_fin,
    estado: fila.estado,
  };
}

/**
 * "Mis turnos" (Módulo 3, Historia "Monitoreo en tiempo real del turno
 * reservado"). Carga inicial vía GET /api/turnos/mis-turnos (Paso 1,
 * paginada — tope 50) y se suscribe a Supabase Realtime (Postgres Changes,
 * evento UPDATE filtrado por `reservado_por=eq.<usuarioId>`, Paso 2) para
 * reflejar sin recargar la página cuando el proveedor cancela un turno —
 * misma excepción arquitectónica que BadgeVerificacion.tsx/
 * CampanaNotificaciones.tsx: un evento en vivo del lado del cliente, no algo
 * que deba pasar por nuestra propia API.
 *
 * El filtro Realtime es EXCLUSIVAMENTE por `reservado_por` (verificación
 * técnica del ticket) — nunca expone turnos de otro usuario en el canal, y
 * la RLS `turnos_select` (docs/ROLES.md) es la última línea de defensa si
 * algo se saltea ese filtro del lado del cliente.
 */
export default function MisTurnos() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [items, setItems] = useState<TurnoApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarPagina = useCallback(async (paginaSolicitada: number) => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const respuesta = await fetch(`/api/turnos/mis-turnos?pagina=${paginaSolicitada}&porPagina=${POR_PAGINA}`);
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
  }, []);

  useEffect(() => {
    cargarPagina(1);
  }, [cargarPagina]);

  // Resuelve el usuario autenticado directo con Supabase Auth (mismo
  // criterio que FormularioReporteWizard.tsx): la página necesita su propio
  // id para armar el filtro del canal Realtime, incluso antes de que llegue
  // ningún turno propio (lista inicial vacía).
  useEffect(() => {
    const supabase = crearClienteSupabaseNavegador();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUsuarioId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!usuarioId) return;

    const supabase = crearClienteSupabaseNavegador();
    const canal = supabase
      .channel(`turnos-propios-${usuarioId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'turnos', filter: `reservado_por=eq.${usuarioId}` },
        (payload: { new: FilaRealtimeTurno }) => {
          setItems((actuales) => {
            const existente = actuales.find((item) => item.id === payload.new.id);
            const actualizado = filaRealtimeATurno(payload.new, existente?.eventoTitulo ?? null);
            if (existente) {
              return actuales.map((item) => (item.id === actualizado.id ? actualizado : item));
            }
            // Primera vez que este turno pasa a ser "mío" (reservado en otra
            // pestaña/sesión mientras la página estaba abierta) — se agrega
            // arriba de la lista en vez de esperar a un refetch manual.
            return [actualizado, ...actuales];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuarioId]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Mis turnos</h1>
      <p className="mb-6 text-sm text-slate-400">
        Turnos reservados en operativos municipales y veterinarios. Se actualiza automáticamente si el estado cambia.
      </p>

      {errorCarga ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {errorCarga}
        </p>
      ) : null}

      {cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}

      {!cargando && !errorCarga && items.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-700 p-8 text-center">
          <p className="mb-1 text-sm font-medium text-slate-50">Todavía no reservaste ningún turno.</p>
          <p className="text-sm text-slate-400">Elegí un operativo en el calendario público para reservar el tuyo.</p>
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const info = ETIQUETAS_ESTADO[item.estado] ?? {
              texto: item.estado,
              icono: '•',
              clases: 'border-slate-600 bg-slate-800 text-slate-300',
            };
            return (
              <li key={item.id} className="rounded-md border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-50">{item.eventoTitulo ?? 'Turno veterinario'}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{formatearFranja(item.franjaInicio)}</p>
                  </div>
                  <span
                    role="status"
                    className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${info.clases}`}
                  >
                    <span aria-hidden="true">{info.icono}</span>
                    {info.texto}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
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
