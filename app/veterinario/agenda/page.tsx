'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';

interface FranjaApi {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const NOMBRE_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function PaginaAgendaVeterinario() {
  const [franjas, setFranjas] = useState<FranjaApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [diaSemana, setDiaSemana] = useState('1');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [turnosGenerados, setTurnosGenerados] = useState<number | null>(null);

  const cargarFranjas = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/veterinarios/disponibilidad');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as FranjaApi[];
      setFranjas(datos);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarFranjas();
  }, [cargarFranjas]);

  async function configurarFranja(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setErrorGuardado(null);
    setTurnosGenerados(null);

    try {
      const respuesta = await fetchConSesion('/api/veterinarios/disponibilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diaSemana: Number(diaSemana), horaInicio, horaFin }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorGuardado(cuerpo.mensaje);
        setGuardando(false);
        return;
      }

      const resultado = (await respuesta.json()) as { turnosGenerados: number };
      setTurnosGenerados(resultado.turnosGenerados);
      setHoraInicio('');
      setHoraFin('');
      setGuardando(false);
      await cargarFranjas();
    } catch {
      setErrorGuardado(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setGuardando(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota con estetoscopio revisando una ficha clínica"
          titulo="Mi agenda"
          descripcion="Configurá tus franjas horarias semanales. Cada franja genera turnos disponibles automáticamente."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      <form
        onSubmit={configurarFranja}
        noValidate
        className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="diaSemana" className="text-sm font-medium text-text-primary">
            Día
          </label>
          <select
            id="diaSemana"
            value={diaSemana}
            onChange={(e) => setDiaSemana(e.target.value)}
            className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {NOMBRE_DIA.map((nombre, indice) => (
              <option key={nombre} value={indice}>
                {nombre}
              </option>
            ))}
          </select>
        </div>

        <CampoTexto
          id="horaInicio"
          label="Desde"
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
          required
        />
        <CampoTexto
          id="horaFin"
          label="Hasta"
          type="time"
          value={horaFin}
          onChange={(e) => setHoraFin(e.target.value)}
          error={errorGuardado ?? undefined}
          required
        />

        <Boton type="submit" disabled={guardando || !horaInicio || !horaFin}>
          {guardando ? 'Guardando…' : 'Agregar franja'}
        </Boton>
      </form>

      {turnosGenerados != null ? (
        <p className="mb-6 text-sm text-success">
          Franja configurada. Se generaron {turnosGenerados} turnos nuevos disponibles.
        </p>
      ) : null}

      {franjas === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}

      {franjas && franjas.length === 0 ? (
        <p className="text-sm text-text-muted">Todavía no configuraste ninguna franja horaria.</p>
      ) : null}

      {franjas && franjas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {franjas.map((franja) => (
            <li key={franja.id}>
              <Tarjeta className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-primary">
                  {NOMBRE_DIA[franja.diaSemana]} · {franja.horaInicio} a {franja.horaFin}
                </span>
                <Badge tono={franja.activo ? 'exito' : 'neutro'}>
                  {franja.activo ? 'Activa' : 'Inactiva'}
                </Badge>
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
