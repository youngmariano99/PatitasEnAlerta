'use client';

import { useEffect, useState } from 'react';
import { crearClienteSupabaseNavegador } from '@infraestructura/adaptadores/ClienteSupabaseNavegador';

export type EstadoVerificacion = 'no_requerido' | 'pendiente' | 'verificado' | 'rechazado';

interface BadgeVerificacionProps {
  /** id del usuario dueño de la fila (auth.uid()) — filtra la suscripción Realtime a esa fila únicamente. */
  usuarioId: string;
  /** Estado ya conocido al montar (ver GET /api/perfil) — evita un parpadeo en blanco mientras llega el primer evento. */
  estadoInicial: EstadoVerificacion;
}

interface ConfiguracionEstado {
  texto: string;
  icono: string;
  clases: string;
}

// Paleta obligatoria del Design System (PLANIFICACION.md Sección 5): solo
// slate/blue/emerald/red — nada de amarillo/ámbar para "pendiente", por eso
// usa el neutro slate en vez de inventar un color de advertencia.
const CONFIGURACION_POR_ESTADO: Record<Exclude<EstadoVerificacion, 'no_requerido'>, ConfiguracionEstado> = {
  pendiente: {
    texto: 'Verificación pendiente',
    icono: '⏳',
    clases: 'border-slate-600 bg-slate-800 text-slate-300',
  },
  verificado: {
    texto: 'Verificado',
    icono: '✅',
    clases: 'border-emerald-500 bg-slate-800 text-emerald-500',
  },
  rechazado: {
    texto: 'Verificación rechazada',
    icono: '⚠️',
    clases: 'border-red-500 bg-slate-800 text-red-500',
  },
};

/**
 * Badge persistente del estado de verificación profesional (AUTH-07). Nunca
 * se oculta ni maquilla el estado real: los tres estados posibles (pendiente/
 * verificado/rechazado) siempre se comunican con ícono + texto, nunca solo
 * con el color del borde/fondo (NFR de Accesibilidad).
 *
 * Se suscribe directo a Supabase Realtime sobre la fila propia de `usuarios`
 * (Postgres Changes, filtrado por `id=eq.<usuarioId>`) para reflejar sin
 * recargar cuando un Administrador aprueba/rechaza la verificación — la
 * misma excepción arquitectónica que ClienteSupabaseNavegador ya documenta
 * (AUTH-06): esto es inherentemente un evento en vivo del lado del cliente,
 * no algo que deba pasar por nuestra propia API.
 */
export function BadgeVerificacion({ usuarioId, estadoInicial }: BadgeVerificacionProps) {
  const [estado, setEstado] = useState<EstadoVerificacion>(estadoInicial);

  useEffect(() => {
    setEstado(estadoInicial);
  }, [estadoInicial]);

  useEffect(() => {
    const supabase = crearClienteSupabaseNavegador();
    const canal = supabase
      .channel(`usuarios-verificacion-${usuarioId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'usuarios', filter: `id=eq.${usuarioId}` },
        (payload: { new: { estado_verificacion?: EstadoVerificacion } }) => {
          const nuevoEstado = payload.new.estado_verificacion;
          if (nuevoEstado) setEstado(nuevoEstado);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuarioId]);

  if (estado === 'no_requerido') return null;

  const configuracion = CONFIGURACION_POR_ESTADO[estado];

  return (
    <span
      role="status"
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${configuracion.clases}`}
    >
      <span aria-hidden="true">{configuracion.icono}</span>
      {configuracion.texto}
    </span>
  );
}
