'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';

interface EntradaLibretaApi {
  id: string;
  veterinarioId: string;
  tipo: 'vacuna' | 'visita' | 'observacion';
  descripcion: string;
  fecha: string;
  createdAt: string;
}

interface AutorizacionApi {
  id: string;
  veterinarioId: string;
  otorgadaEn: string;
  revocadaEn: string | null;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const ETIQUETA_TIPO: Record<EntradaLibretaApi['tipo'], string> = {
  vacuna: 'Vacuna',
  visita: 'Visita',
  observacion: 'Observación',
};

export default function PaginaLibretaSanitaria() {
  const params = useParams<{ id: string }>();
  const [entradas, setEntradas] = useState<EntradaLibretaApi[] | null>(null);
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [veterinarioId, setVeterinarioId] = useState('');
  const [autorizando, setAutorizando] = useState(false);
  const [errorAutorizar, setErrorAutorizar] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [respuestaLibreta, respuestaAutorizaciones] = await Promise.all([
        fetchConSesion(`/api/mascotas/${params.id}/libreta`),
        fetchConSesion(`/api/mascotas/${params.id}/autorizaciones`),
      ]);

      if (!respuestaLibreta.ok) {
        const cuerpo = (await respuestaLibreta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      if (!respuestaAutorizaciones.ok) {
        const cuerpo = (await respuestaAutorizaciones.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }

      const libreta = (await respuestaLibreta.json()) as { items: EntradaLibretaApi[] };
      const autorizacionesApi = (await respuestaAutorizaciones.json()) as AutorizacionApi[];
      setEntradas(libreta.items);
      setAutorizaciones(autorizacionesApi);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, [params.id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  async function autorizarVeterinario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setAutorizando(true);
    setErrorAutorizar(null);

    try {
      const respuesta = await fetchConSesion(`/api/mascotas/${params.id}/autorizaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ veterinarioId }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorAutorizar(cuerpo.mensaje);
        setAutorizando(false);
        return;
      }

      setVeterinarioId('');
      setAutorizando(false);
      await cargarDatos();
    } catch {
      setErrorAutorizar(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setAutorizando(false);
    }
  }

  async function revocarAutorizacion(idVeterinario: string) {
    const respuesta = await fetchConSesion(
      `/api/mascotas/${params.id}/autorizaciones/${idVeterinario}`,
      {
        method: 'DELETE',
      },
    );
    if (respuesta.ok) {
      await cargarDatos();
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      </main>
    );
  }

  const autorizacionesVigentes = (autorizaciones ?? []).filter((a) => !a.revocadaEn);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota con estetoscopio revisando una ficha clínica"
          titulo="Libreta sanitaria"
          descripcion="Historial de vacunas, visitas y observaciones, y veterinarios autorizados a escribir en ella."
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">
          Veterinarios autorizados
        </h2>

        <form
          onSubmit={autorizarVeterinario}
          noValidate
          className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <CampoTexto
              id="veterinarioId"
              label="Id del veterinario a autorizar"
              placeholder="UUID que te compartió tu veterinario/a"
              value={veterinarioId}
              onChange={(e) => setVeterinarioId(e.target.value)}
              error={errorAutorizar ?? undefined}
              required
            />
          </div>
          <Boton type="submit" disabled={autorizando || !veterinarioId.trim()}>
            {autorizando ? 'Autorizando…' : 'Autorizar'}
          </Boton>
        </form>

        {autorizaciones === null ? <p className="text-sm text-text-muted">Cargando…</p> : null}

        {autorizaciones && autorizacionesVigentes.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no autorizaste a ningún veterinario.</p>
        ) : null}

        {autorizacionesVigentes.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {autorizacionesVigentes.map((autorizacion) => (
              <li key={autorizacion.id}>
                <Tarjeta className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {autorizacion.veterinarioId}
                    </p>
                    <Badge tono="exito">Autorizado</Badge>
                  </div>
                  <Boton
                    variante="texto"
                    onClick={() => revocarAutorizacion(autorizacion.veterinarioId)}
                  >
                    Revocar
                  </Boton>
                </Tarjeta>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Historial</h2>

        {entradas === null ? <p className="text-sm text-text-muted">Cargando…</p> : null}

        {entradas && entradas.length === 0 ? (
          <p className="text-sm text-text-muted">
            Todavía no hay entradas en la libreta sanitaria.
          </p>
        ) : null}

        {entradas && entradas.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {entradas.map((entrada) => (
              <li key={entrada.id}>
                <Tarjeta>
                  <div className="mb-1 flex items-center justify-between">
                    <Badge tono="neutro">{ETIQUETA_TIPO[entrada.tipo]}</Badge>
                    <span className="font-mono text-xs text-text-muted">{entrada.fecha}</span>
                  </div>
                  <p className="text-sm text-text-primary">{entrada.descripcion}</p>
                </Tarjeta>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
