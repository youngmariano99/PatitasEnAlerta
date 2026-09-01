'use client';

import { useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { TIPOS_EVENTO_SOPORTADOS, type TipoEvento } from '@aplicacion/dtos/municipio/CrearEventoDto';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que app/reportes/nuevo (SelectorUbicacionMapa).
const SelectorUbicacionMapa = dynamic(
  () => import('@presentacion/componentes/mapas/SelectorUbicacionMapa').then((mod) => mod.SelectorUbicacionMapa),
  { ssr: false, loading: () => <p className="text-sm text-slate-400">Cargando mapa…</p> },
);

// Coordenadas de Coronel Pringles (docs/SCHEMA.md) — centro por defecto del
// mapa hasta que el municipio marque la ubicación real del operativo.
const CENTRO_POR_DEFECTO: [number, number] = [-37.9989, -61.3565];

const ETIQUETAS_TIPO: Record<TipoEvento, string> = {
  castracion: 'Castración',
  vacunacion: 'Vacunación',
  desparasitacion: 'Desparasitación',
  otro: 'Otro',
};

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

/**
 * Alta rápida de un operativo municipal (Módulo 3, "Alta rápida de
 * operativos municipales"). Sin pasos ni aprobación intermedia: al
 * confirmar, POST /api/municipio/eventos ya deja el operativo visible en el
 * calendario público (RLS `eventos_select_publico`). middleware.ts protege
 * toda `/municipio/*` con rol municipio/administrador — esta página no
 * repite esa verificación, a diferencia de PanelReportesMunicipio.tsx (que sí
 * la duplica porque conviven roles distintos en la MISMA página; acá el
 * panel completo es exclusivo de un solo rol).
 */
export default function PaginaNuevoEvento() {
  const router = useRouter();

  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoEvento | ''>('');
  const [direccion, setDireccion] = useState('');
  const [fecha, setFecha] = useState('');
  const [cuposTotales, setCuposTotales] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [posicion, setPosicion] = useState<[number, number] | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [errorFecha, setErrorFecha] = useState<string | null>(null);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const camposCompletos =
    titulo.trim().length > 0 && tipo !== '' && direccion.trim().length > 0 && fecha.length > 0 && Number(cuposTotales) > 0;

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorFecha(null);
    setErrorUbicacion(null);
    setErrorGeneral(null);

    if (!posicion) {
      setErrorUbicacion('Marcá en el mapa dónde se realiza el operativo.');
      return;
    }
    if (!camposCompletos) return;

    setEnviando(true);
    try {
      const respuesta = await fetch('/api/municipio/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          tipo,
          direccion,
          latitud: posicion[0],
          longitud: posicion[1],
          fecha: new Date(fecha).toISOString(),
          cuposTotales: Number(cuposTotales),
          requisitos: requisitos.trim() || undefined,
        }),
      });

      if (respuesta.status === 201) {
        router.push('/municipio/eventos');
        return;
      }

      const cuerpo = (await respuesta.json()) as RespuestaError;
      if (cuerpo.codigo === 'PEA-MUN-004') {
        setErrorFecha(cuerpo.mensaje);
      } else {
        setErrorGeneral(cuerpo.mensaje);
      }
      setEnviando(false);
    } catch {
      setErrorGeneral('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Nuevo operativo</h1>
      <p className="mb-6 text-sm text-slate-400">
        Alta rápida: en cuanto confirmes, el operativo queda visible en el calendario público.
      </p>

      <form onSubmit={manejarEnvio} noValidate className="flex flex-col gap-4">
        <CampoTexto
          id="titulo"
          label="Título"
          placeholder="Jornada de castración — Barrio Norte"
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo" className="text-sm font-medium text-slate-50">
            Tipo de operativo
          </label>
          <select
            id="tipo"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as TipoEvento | '')}
            required
            className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Elegí un tipo…</option>
            {TIPOS_EVENTO_SOPORTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETAS_TIPO[valor]}
              </option>
            ))}
          </select>
        </div>

        <CampoTexto
          id="direccion"
          label="Dirección"
          placeholder="Calle 25 N° 450"
          value={direccion}
          onChange={(evento) => setDireccion(evento.target.value)}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-50">Ubicación en el mapa</label>
          <SelectorUbicacionMapa
            centro={posicion ?? CENTRO_POR_DEFECTO}
            posicion={posicion}
            onSeleccionar={(latitud, longitud) => {
              setErrorUbicacion(null);
              setPosicion([latitud, longitud]);
            }}
          />
          {errorUbicacion ? (
            <p className="flex items-center gap-1.5 text-sm text-red-500">
              <span aria-hidden="true">⚠️</span>
              {errorUbicacion}
            </p>
          ) : (
            <p className="text-sm text-slate-400">Tocá el mapa para marcar el punto exacto.</p>
          )}
        </div>

        <CampoTexto
          id="fecha"
          label="Fecha y hora"
          type="datetime-local"
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
          error={errorFecha ?? undefined}
          ayuda={errorFecha ? undefined : 'Tiene que ser posterior al momento actual.'}
          required
        />

        <CampoTexto
          id="cuposTotales"
          label="Cupos totales"
          type="number"
          min={1}
          step={1}
          placeholder="30"
          value={cuposTotales}
          onChange={(evento) => setCuposTotales(evento.target.value)}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="requisitos" className="text-sm font-medium text-slate-50">
            Requisitos (opcional)
          </label>
          <textarea
            id="requisitos"
            rows={3}
            placeholder="Traer a la mascota con collar/bozal y DNI del tutor."
            value={requisitos}
            onChange={(evento) => setRequisitos(evento.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-[15px] text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {errorGeneral ? (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <span aria-hidden="true">⚠️</span>
            {errorGeneral}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enviando || !camposCompletos}
          className="mt-2 h-11 min-h-[44px] rounded-md bg-blue-500 text-[15px] font-medium text-slate-50 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Publicando…' : 'Publicar operativo'}
        </button>
      </form>
    </main>
  );
}
