'use client';

import { useState, type FormEvent } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';

interface ReporteSimilarApi {
  id: string;
  tipo: string;
  descripcion: string;
  fotoUrl: string;
  similitud: number;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

export default function PaginaBuscarReportesSimilares() {
  const [consulta, setConsulta] = useState('');
  const [resultados, setResultados] = useState<ReporteSimilarApi[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setBuscando(true);
    setError(null);

    try {
      const respuesta = await fetchConSesion(
        `/api/red-colaboracion/reportes/similares?consulta=${encodeURIComponent(consulta)}`,
      );
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        setBuscando(false);
        return;
      }
      const datos = (await respuesta.json()) as ReporteSimilarApi[];
      setResultados(datos);
      setBuscando(false);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      setBuscando(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Mapa-Animales-encontrados.png"
          alt="Mascota señalando un punto en el mapa"
          titulo="Buscar reportes similares"
          descripcion='Ej. "gato asustadizo con otros perros" — busca por similitud de descripción, no por palabras exactas.'
        />
      </div>

      <form
        onSubmit={buscar}
        noValidate
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <CampoTexto
            id="consulta"
            label="¿Qué estás buscando?"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            error={error ?? undefined}
            required
          />
        </div>
        <Boton type="submit" disabled={buscando || consulta.trim().length < 3}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </Boton>
      </form>

      {resultados && resultados.length === 0 ? (
        <p className="text-sm text-text-muted">No encontramos reportes similares a esa búsqueda.</p>
      ) : null}

      {resultados && resultados.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {resultados.map((reporte) => (
            <li key={reporte.id}>
              <Tarjeta className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reporte.fotoUrl}
                  alt={reporte.tipo}
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
                <div>
                  <p className="text-sm text-text-primary">{reporte.descripcion}</p>
                  <p className="font-mono text-xs text-text-muted">
                    {Math.round(reporte.similitud * 100)}% de similitud
                  </p>
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
