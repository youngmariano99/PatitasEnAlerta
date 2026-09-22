'use client';

import { useEffect, useState } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';

interface EventoApi {
  id: string;
  titulo: string;
  fecha: string;
  cuposTotales: number;
}

interface TurnoApi {
  id: string;
  franjaInicio: string;
  franjaFin: string;
  estado: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const TONO_POR_ESTADO: Record<string, 'exito' | 'neutro' | 'alerta'> = {
  disponible: 'exito',
  reservado: 'neutro',
  cancelado: 'alerta',
};

function formatearFranja(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PaginaTurneraMunicipal() {
  const [eventos, setEventos] = useState<EventoApi[] | null>(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<TurnoApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/municipio/eventos?porPagina=20')
      .then((r) => r.json())
      .then((datos: { items: EventoApi[] }) => {
        if (!cancelado) setEventos(datos.items);
      })
      .catch(() => {
        if (!cancelado)
          setError(
            'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
          );
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!eventoSeleccionado) return;
    let cancelado = false;
    setTurnos(null);

    fetchConSesion(`/api/turnos/por-evento?eventoId=${eventoSeleccionado}`)
      .then(async (respuesta) => {
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json()) as RespuestaError;
          if (!cancelado) setError(cuerpo.mensaje);
          return;
        }
        const datos = (await respuesta.json()) as TurnoApi[];
        if (!cancelado) setTurnos(datos);
      })
      .catch(() => {
        if (!cancelado)
          setError(
            'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
          );
      });

    return () => {
      cancelado = true;
    };
  }, [eventoSeleccionado]);

  const disponibles = (turnos ?? []).filter((t) => t.estado === 'disponible').length;
  const reservados = (turnos ?? []).filter((t) => t.estado === 'reservado').length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Datos y turnos del municipio.png"
          alt="Mascota organizando un calendario de turnos"
          titulo="Turnera municipal"
          descripcion="Elegí un operativo para ver el estado de sus turnos: disponibles, reservados y cancelados."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      <div className="mb-6 flex flex-col gap-1.5">
        <label htmlFor="evento" className="text-sm font-medium text-text-primary">
          Operativo
        </label>
        <select
          id="evento"
          value={eventoSeleccionado ?? ''}
          onChange={(e) => setEventoSeleccionado(e.target.value || null)}
          className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Elegí un operativo…</option>
          {(eventos ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.titulo} · {formatearFranja(e.fecha)}
            </option>
          ))}
        </select>
      </div>

      {eventoSeleccionado && turnos ? (
        <p className="mb-4 text-sm text-text-muted">
          {disponibles} disponibles · {reservados} reservados de {turnos.length} turnos generados
        </p>
      ) : null}

      {eventoSeleccionado && turnos === null ? (
        <p className="text-sm text-text-muted">Cargando…</p>
      ) : null}

      {turnos && turnos.length === 0 ? (
        <p className="text-sm text-text-muted">Este operativo todavía no tiene turnos generados.</p>
      ) : null}

      {turnos && turnos.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {turnos.map((turno) => (
            <li key={turno.id}>
              <Tarjeta className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-text-primary">
                  {formatearFranja(turno.franjaInicio)}
                </span>
                <Badge tono={TONO_POR_ESTADO[turno.estado] ?? 'neutro'}>{turno.estado}</Badge>
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
