'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';

interface EventoApi {
  id: string;
  titulo: string;
  tipo: string;
  direccion: string;
  fecha: string;
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

function formatearFranja(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

function ContenidoPaginaReservar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventoId = searchParams.get('eventoId');

  const [eventos, setEventos] = useState<EventoApi[] | null>(null);
  const [evento, setEvento] = useState<EventoApi | null>(null);
  const [turnos, setTurnos] = useState<TurnoApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reservando, setReservando] = useState<string | null>(null);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (eventoId) return;
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
  }, [eventoId]);

  const cargarTurnos = useCallback(async () => {
    if (!eventoId) return;
    try {
      const [respuestaEventos, respuestaTurnos] = await Promise.all([
        fetch(`/api/municipio/eventos?porPagina=20`),
        fetchConSesion(`/api/turnos/por-evento?eventoId=${eventoId}`),
      ]);

      const datosEventos = (await respuestaEventos.json()) as { items: EventoApi[] };
      const eventoActual = datosEventos.items.find((e) => e.id === eventoId) ?? null;
      setEvento(eventoActual);

      if (!respuestaTurnos.ok) {
        const cuerpo = (await respuestaTurnos.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datosTurnos = (await respuestaTurnos.json()) as TurnoApi[];
      setTurnos(datosTurnos);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, [eventoId]);

  useEffect(() => {
    cargarTurnos();
  }, [cargarTurnos]);

  async function reservar(turnoId: string) {
    setReservando(turnoId);
    setErrorReserva(null);

    try {
      const respuesta = await fetchConSesion('/api/turnos/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnoId }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorReserva(cuerpo.mensaje);
        setReservando(null);
        // El 409 significa que otra persona ganó la carrera — refrescamos
        // la lista para que ya no aparezca como "disponible".
        await cargarTurnos();
        return;
      }

      setExito(true);
      setReservando(null);
    } catch {
      setErrorReserva(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setReservando(null);
    }
  }

  if (exito) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <EstadoIlustrado
          imagenSrc="/animales/Éxito-Confirmación.png"
          alt="Mascotas de Patitas en Alerta festejando"
          titulo="¡Turno reservado!"
          descripcion="Vas a poder verlo y cancelarlo desde Mis turnos."
          accion={<Boton onClick={() => router.push('/turnos/mis-turnos')}>Ir a mis turnos</Boton>}
        />
      </main>
    );
  }

  if (!eventoId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <EncabezadoIlustrado
          imagenSrc="/animales/Datos y turnos del municipio.png"
          alt="Mascota organizando un calendario de turnos"
          titulo="Reservar un turno"
          descripcion="Elegí un operativo municipal para ver sus horarios disponibles."
        />
        <div className="mt-6" />
        {error ? (
          <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
            <span aria-hidden="true">⚠️</span>
            {error}
          </p>
        ) : null}
        {eventos === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
        {eventos && eventos.length === 0 ? (
          <p className="text-sm text-text-muted">No hay operativos municipales próximos.</p>
        ) : null}
        {eventos && eventos.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {eventos.map((e) => (
              <li key={e.id}>
                <Tarjeta className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{e.titulo}</p>
                    <p className="text-sm text-text-muted">
                      {e.direccion} · {formatearFranja(e.fecha)}
                    </p>
                  </div>
                  <Boton onClick={() => router.push(`/turnos/reservar?eventoId=${e.id}`)}>
                    Ver turnos
                  </Boton>
                </Tarjeta>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    );
  }

  const disponibles = (turnos ?? []).filter((t) => t.estado === 'disponible');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <EncabezadoIlustrado
        imagenSrc="/animales/Datos y turnos del municipio.png"
        alt="Mascota organizando un calendario de turnos"
        titulo={evento ? evento.titulo : 'Turnos disponibles'}
        descripcion={evento ? evento.direccion : undefined}
      />
      <div className="mt-6" />

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}
      {errorReserva ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {errorReserva}
        </p>
      ) : null}

      {turnos === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}

      {turnos && disponibles.length === 0 ? (
        <p className="text-sm text-text-muted">
          No quedan horarios disponibles para este operativo.
        </p>
      ) : null}

      {disponibles.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {disponibles.map((turno) => (
            <li key={turno.id}>
              <Tarjeta className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm text-text-primary">
                    {formatearFranja(turno.franjaInicio)}
                  </p>
                  <Badge tono="exito">Disponible</Badge>
                </div>
                <Boton disabled={reservando === turno.id} onClick={() => reservar(turno.id)}>
                  {reservando === turno.id ? 'Reservando…' : 'Reservar'}
                </Boton>
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}

export default function PaginaReservarTurno() {
  return (
    <Suspense fallback={null}>
      <ContenidoPaginaReservar />
    </Suspense>
  );
}
