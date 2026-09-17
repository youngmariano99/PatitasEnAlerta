'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';

interface TurnoApi {
  id: string;
  franjaInicio: string;
  franjaFin: string;
  reservadoPorEmail: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

function formatearFranja(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PaginaTurnosVeterinario() {
  const [turnos, setTurnos] = useState<TurnoApi[] | null>(null);
  const [tasaNoShow, setTasaNoShow] = useState<{ totalConcluidos: number; tasa: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [respuestaTurnos, respuestaTasa] = await Promise.all([
        fetchConSesion('/api/veterinarios/turnos'),
        fetchConSesion('/api/turnos/mi-tasa-no-show'),
      ]);

      if (!respuestaTurnos.ok) {
        const cuerpo = (await respuestaTurnos.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datosTurnos = (await respuestaTurnos.json()) as { items: TurnoApi[] };
      setTurnos(datosTurnos.items);

      if (respuestaTasa.ok) {
        setTasaNoShow(await respuestaTasa.json());
      }
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  async function marcarAsistencia(turnoId: string, asistio: boolean) {
    setMarcando(turnoId);
    try {
      const respuesta = await fetchConSesion('/api/turnos/marcar-asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnoId, asistio }),
      });
      if (respuesta.ok) {
        await cargarDatos();
      }
    } finally {
      setMarcando(null);
    }
  }

  const ahora = Date.now();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota con estetoscopio revisando una ficha clínica"
          titulo="Mis turnos"
          descripcion="Turnos reservados por tus pacientes."
        />
      </div>

      {tasaNoShow ? (
        <p className="mb-6 text-sm text-text-muted">
          Tasa de no-show:{' '}
          <span className="font-mono text-text-primary">{Math.round(tasaNoShow.tasa * 100)}%</span>{' '}
          (sobre {tasaNoShow.totalConcluidos} turnos concluidos)
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {turnos === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}

      {turnos && turnos.length === 0 ? (
        <p className="text-sm text-text-muted">Todavía no tenés turnos reservados.</p>
      ) : null}

      {turnos && turnos.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {turnos.map((turno) => {
            const franjaConcluida = new Date(turno.franjaFin).getTime() <= ahora;
            return (
              <li key={turno.id}>
                <Tarjeta className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-text-primary">
                      {formatearFranja(turno.franjaInicio)}
                    </p>
                    <p className="text-sm text-text-muted">{turno.reservadoPorEmail}</p>
                  </div>
                  {franjaConcluida ? (
                    <div className="flex gap-2">
                      <Boton
                        variante="secundaria"
                        disabled={marcando === turno.id}
                        onClick={() => marcarAsistencia(turno.id, true)}
                      >
                        Asistió
                      </Boton>
                      <Boton
                        variante="texto"
                        disabled={marcando === turno.id}
                        onClick={() => marcarAsistencia(turno.id, false)}
                      >
                        No asistió
                      </Boton>
                    </div>
                  ) : (
                    <Badge tono="neutro">Próximo</Badge>
                  )}
                </Tarjeta>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
