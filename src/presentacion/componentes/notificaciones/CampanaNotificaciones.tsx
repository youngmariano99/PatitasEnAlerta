'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlarmClock,
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Handshake,
  Info,
  PawPrint,
  type LucideIcon,
} from 'lucide-react';
import { crearClienteSupabaseNavegador } from '@infraestructura/adaptadores/ClienteSupabaseNavegador';

interface NotificacionApi {
  id: string;
  tipo: string;
  referenciaTabla: string;
  referenciaId: string;
  leido: boolean;
  createdAt: string;
}

interface RespuestaListado {
  items: NotificacionApi[];
  total: number;
  pagina: number;
  porPagina: number;
  noLeidas: number;
}

interface FilaRealtime {
  id: string;
  tipo: string;
  referencia_tabla: string;
  referencia_id: string;
  leido: boolean;
  created_at: string;
}

const ETIQUETAS_TIPO: Record<string, { texto: string; icono: LucideIcon }> = {
  reporte_coincidente: { texto: 'Encontramos una coincidencia con tu reporte', icono: PawPrint },
  turno_confirmado: { texto: 'Turno confirmado', icono: CalendarCheck },
  turno_cancelado: { texto: 'Turno cancelado', icono: CalendarX },
  turno_recordatorio: { texto: 'Recordatorio de turno', icono: AlarmClock },
  verificacion_resuelta: { texto: 'Tu verificación fue resuelta', icono: CheckCircle2 },
  colaboracion_propuesta: { texto: 'Recibiste un ofrecimiento de colaboración', icono: Handshake },
};

/**
 * Mapea `referenciaTabla` a la pantalla donde ese registro es visible — el
 * mismo criterio de "reutilización antes que invención" del resto del
 * sprint: la campana no inventa una vista nueva, solo enlaza a la pantalla
 * ya construida para cada tabla (`docs/SCHEMA.md`, columna `referencia_tabla`
 * de `notificaciones`). `turnos` no tiene una vista de detalle por ID
 * todavía, así que enlaza al listado; `verificaciones` no tiene ninguna
 * pantalla propia del lado del solicitante, por eso queda sin enlace.
 */
function rutaDeNotificacion(referenciaTabla: string, referenciaId: string): string | null {
  switch (referenciaTabla) {
    case 'reportes':
      return `/reportes/${referenciaId}`;
    case 'colaboraciones':
      return `/red-colaboracion/colaboraciones/${referenciaId}`;
    case 'turnos':
      return '/turnos/mis-turnos';
    default:
      return null;
  }
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function filaRealtimeANotificacion(fila: FilaRealtime): NotificacionApi {
  return {
    id: fila.id,
    tipo: fila.tipo,
    referenciaTabla: fila.referencia_tabla,
    referenciaId: fila.referencia_id,
    leido: fila.leido,
    createdAt: fila.created_at,
  };
}

interface CampanaNotificacionesProps {
  /** id del usuario autenticado (auth.uid()) — filtra la suscripción Realtime a sus propias filas. */
  usuarioId: string;
}

/**
 * Bell de notificaciones (Paso 3, REP-U-06): al montar carga la bandeja
 * propia vía GET /api/notificaciones y se suscribe a Supabase Realtime
 * (Postgres Changes, INSERT filtrado por `usuario_id=eq.<usuarioId>`) para
 * reflejar sin recargar cuando DetectarCoincidenciaReporteJob inserta una
 * nueva `reporte_coincidente` — misma excepción arquitectónica que
 * BadgeVerificacion.tsx (evento en vivo del lado del cliente, no algo que
 * deba pasar por nuestra propia API).
 *
 * Marcar como leída SÍ pasa por la API (PATCH /api/notificaciones/{id}):
 * a diferencia de la lectura en vivo, la escritura necesita la verificación
 * de pertenencia del caso de uso (MarcarNotificacionLeida), no solo RLS.
 */
export function CampanaNotificaciones({ usuarioId }: CampanaNotificacionesProps) {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<NotificacionApi[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarBandeja = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const respuesta = await fetch('/api/notificaciones?pagina=1&porPagina=10');
      if (!respuesta.ok) {
        setErrorCarga('No pudimos cargar tus notificaciones.');
        return;
      }
      const datos = (await respuesta.json()) as RespuestaListado;
      setItems(datos.items);
      setNoLeidas(datos.noLeidas);
    } catch {
      setErrorCarga('No pudimos conectarnos con el servidor.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarBandeja();
  }, [cargarBandeja]);

  useEffect(() => {
    const supabase = crearClienteSupabaseNavegador();
    const canal = supabase
      .channel(`notificaciones-${usuarioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${usuarioId}`,
        },
        (payload: { new: FilaRealtime }) => {
          const nueva = filaRealtimeANotificacion(payload.new);
          setItems((actuales) => [nueva, ...actuales].slice(0, 10));
          setNoLeidas((actual) => actual + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuarioId]);

  async function marcarComoLeida(id: string) {
    const anteriores = items;
    setItems((actuales) =>
      actuales.map((item) => (item.id === id ? { ...item, leido: true } : item)),
    );
    setNoLeidas((actual) => Math.max(0, actual - 1));

    try {
      const respuesta = await fetch(`/api/notificaciones/${id}`, { method: 'PATCH' });
      if (!respuesta.ok) throw new Error('fallo al marcar como leída');
    } catch {
      // Revierte el optimistic update si la API rechazó — nunca dejar el
      // badge mintiendo sobre un estado que en realidad no se persistió.
      setItems(anteriores);
      setNoLeidas((actual) => actual + 1);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
        className="relative flex h-11 w-11 min-h-[44px] items-center justify-center rounded-full border border-surface2 bg-surface1 text-text-primary"
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {noLeidas > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 text-xs font-medium text-text-primary">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        ) : null}
      </button>

      {abierto ? (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border border-surface2 bg-surface1 shadow-lg">
          <div className="border-b border-surface2 px-4 py-3">
            <p className="text-sm font-medium text-text-primary">Notificaciones</p>
          </div>

          {cargando ? <p className="px-4 py-3 text-sm text-text-muted">Cargando…</p> : null}

          {errorCarga ? (
            <p className="flex items-center gap-1.5 px-4 py-3 text-sm text-danger">
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {errorCarga}
            </p>
          ) : null}

          {!cargando && !errorCarga && items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">Todavía no tenés notificaciones.</p>
          ) : null}

          {!cargando && !errorCarga && items.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((item) => {
                const info = ETIQUETAS_TIPO[item.tipo] ?? { texto: item.tipo, icono: Info };
                const IconoNotificacion = info.icono;
                const ruta = rutaDeNotificacion(item.referenciaTabla, item.referenciaId);
                const contenido = (
                  <div className="flex items-start gap-2">
                    <IconoNotificacion aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex-1">
                      <p
                        className={
                          item.leido
                            ? 'text-sm text-text-muted'
                            : 'text-sm font-medium text-text-primary'
                        }
                      >
                        {info.texto}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-text-primary">
                        {formatearFecha(item.createdAt)}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={item.id} className="border-b border-surface2 px-4 py-3 last:border-b-0">
                    {ruta ? (
                      <Link
                        href={ruta}
                        onClick={() => {
                          if (!item.leido) marcarComoLeida(item.id);
                          setAbierto(false);
                        }}
                        className="block hover:opacity-80"
                      >
                        {contenido}
                      </Link>
                    ) : (
                      contenido
                    )}
                    {!item.leido ? (
                      <button
                        type="button"
                        onClick={() => marcarComoLeida(item.id)}
                        className="mt-2 text-xs font-medium text-accent underline underline-offset-2"
                      >
                        Marcar como leída
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
