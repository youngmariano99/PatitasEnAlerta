'use client';

import { useEffect, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false es
// obligatorio (no un simple import estático) para que Next.js no intente
// renderizarlo en el servidor.
const SelectorUbicacionMapa = dynamic(
  () => import('@presentacion/componentes/mapas/SelectorUbicacionMapa').then((mod) => mod.SelectorUbicacionMapa),
  { ssr: false, loading: () => <p className="text-sm text-slate-400">Cargando mapa…</p> },
);

// Coordenadas de Coronel Pringles (docs/SCHEMA.md) — centro por defecto del
// mapa mientras no haya ubicación automática ni manual todavía.
const CENTRO_POR_DEFECTO: [number, number] = [-37.9989, -61.3565];

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

type EstadoImagen = 'sin_seleccionar' | 'subiendo' | 'lista' | 'error';
type EstadoUbicacion = 'buscando' | 'automatica' | 'manual';

interface CopiaPorTipo {
  titulo: string;
  bajada: string;
  etiquetaFoto: string;
  placeholderDescripcion: string;
  ayudaDescripcion: string;
  etiquetaEspecie: string;
}

/**
 * Único punto donde el texto difiere entre REP-01 ('perdido') y REP-02
 * ('encontrado') — todo lo demás (validación, pasos, componentes) es
 * exactamente el mismo flujo (ver CrearReporte.ts, "un único caso de uso
 * cubre ambos tipos").
 */
const COPIA_POR_TIPO: Record<TipoReporte, CopiaPorTipo> = {
  perdido: {
    titulo: 'Reportá tu mascota perdida',
    bajada: 'Reportar protege. Cuanto antes lo publiques, más vecinos pueden ayudarte a encontrarla.',
    etiquetaFoto: 'Foto de tu mascota',
    placeholderDescripcion: 'Se perdió cerca de la plaza, responde a su nombre, es muy sociable…',
    ayudaDescripcion: 'Contá dónde y cuándo la viste por última vez, y cualquier detalle que ayude a reconocerla.',
    etiquetaEspecie: 'Especie de tu mascota (opcional)',
  },
  encontrado: {
    titulo: 'Reportá una mascota encontrada',
    bajada: 'Gracias por avisar. Publicarlo ayuda a que su familia la encuentre lo antes posible.',
    etiquetaFoto: 'Foto de la mascota que encontraste',
    placeholderDescripcion: 'La encontré deambulando sola cerca de la plaza, parece perdida…',
    ayudaDescripcion: 'Contá dónde y cuándo la encontraste, y cualquier detalle que ayude a identificarla.',
    etiquetaEspecie: 'Especie del animal (opcional)',
  },
};

async function subirImagenACloudinary(archivo: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary no está configurado en este entorno.');
  }

  const formData = new FormData();
  formData.append('file', archivo);
  formData.append('upload_preset', uploadPreset);

  const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!respuesta.ok) {
    throw new Error('No pudimos subir la imagen. Probá de nuevo.');
  }

  const datos = (await respuesta.json()) as { secure_url: string };
  return datos.secure_url;
}

interface FormularioReporteWizardProps {
  /** Categoría con la que arranca el formulario — ver app/reportes/nuevo/page.tsx (?tipo=). */
  tipoInicial: TipoReporte;
}

/**
 * Wizard de 3 pasos (foto → descripción/especie → ubicación + publicar)
 * compartido por REP-01 (mascota perdida) y REP-02 (mascota encontrada,
 * Módulo 2). `tipoInicial` es el único parámetro que cambia el
 * comportamiento — mismo componente, mismo endpoint POST /api/reportes,
 * mismo caso de uso CrearReporte del lado del servidor.
 */
export function FormularioReporteWizard({ tipoInicial }: FormularioReporteWizardProps) {
  const router = useRouter();
  const copia = COPIA_POR_TIPO[tipoInicial];

  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const [estadoImagen, setEstadoImagen] = useState<EstadoImagen>('sin_seleccionar');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  const [descripcion, setDescripcion] = useState('');
  const [especie, setEspecie] = useState('');

  const [estadoUbicacion, setEstadoUbicacion] = useState<EstadoUbicacion>('buscando');
  const [posicion, setPosicion] = useState<[number, number] | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  // Fallback de geolocalización (criterio de aceptación): si el navegador no
  // ofrece la API o el usuario rechaza el permiso, se ofrece el mapa para
  // elegir manualmente, sin bloquear el resto del flujo.
  useEffect(() => {
    if (paso !== 3 || posicion) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setEstadoUbicacion('manual');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicionNavegador) => {
        setPosicion([posicionNavegador.coords.latitude, posicionNavegador.coords.longitude]);
        setEstadoUbicacion('automatica');
      },
      () => setEstadoUbicacion('manual'),
      { timeout: 8000 },
    );
  }, [paso, posicion]);

  async function manejarSeleccionDeImagen(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    setErrorImagen(null);
    setPreviewLocal(URL.createObjectURL(archivo));
    setEstadoImagen('subiendo');
    setFotoUrl(null);

    try {
      const url = await subirImagenACloudinary(archivo);
      setFotoUrl(url);
      setEstadoImagen('lista');
    } catch {
      setEstadoImagen('error');
      setErrorImagen('No pudimos subir la imagen. Probá de nuevo.');
    }
  }

  function irAlPasoSiguiente() {
    if (paso === 1) {
      if (!fotoUrl) {
        setErrorImagen('Necesitamos una foto para publicar el reporte.');
        return;
      }
      setPaso(2);
      return;
    }
    if (paso === 2) {
      if (!descripcion.trim()) return;
      setPaso(3);
    }
  }

  function volverAlPasoAnterior() {
    setPaso((actual) => (actual > 1 ? ((actual - 1) as 1 | 2) : actual));
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);
    if (!fotoUrl || !descripcion.trim() || !posicion) return;

    setEnviando(true);
    try {
      const respuesta = await fetch('/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoInicial,
          descripcion,
          fotoUrl,
          latitud: posicion[0],
          longitud: posicion[1],
          especie: especie.trim() || undefined,
        }),
      });

      if (respuesta.status === 201) {
        router.push('/reportes');
        return;
      }

      const cuerpo = (await respuesta.json()) as RespuestaError;
      setErrorGeneral(cuerpo.mensaje);
      setEnviando(false);
    } catch {
      setErrorGeneral('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-slate-50">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-400">Paso {paso} de 3</p>
      <h1 className="mb-1 text-xl font-semibold">{copia.titulo}</h1>
      <p className="mb-6 text-sm text-slate-400">{copia.bajada}</p>

      <form onSubmit={manejarEnvio} noValidate className="flex flex-col gap-4">
        {paso === 1 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="foto" className="text-sm font-medium text-slate-50">
              {copia.etiquetaFoto}
            </label>
            <input
              id="foto"
              type="file"
              accept="image/*"
              onChange={manejarSeleccionDeImagen}
              className="text-sm text-slate-400 file:mr-3 file:h-11 file:min-h-[44px] file:rounded-md file:border-0 file:bg-blue-500 file:px-4 file:text-slate-50"
              aria-invalid={Boolean(errorImagen)}
              aria-describedby={errorImagen ? 'foto-error' : undefined}
            />
            {previewLocal ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewLocal}
                alt="Vista previa de la foto del reporte"
                className="mt-1 h-32 w-32 rounded-md border border-slate-700 object-cover"
              />
            ) : null}
            {estadoImagen === 'subiendo' ? <p className="text-sm text-slate-400">Subiendo imagen…</p> : null}
            {errorImagen ? (
              <p id="foto-error" className="flex items-center gap-1.5 text-sm text-red-500">
                <span aria-hidden="true">⚠️</span>
                {errorImagen}
              </p>
            ) : null}
          </div>
        ) : null}

        {paso === 2 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="descripcion" className="text-sm font-medium text-slate-50">
                ¿Qué pasó?
              </label>
              <textarea
                id="descripcion"
                rows={5}
                maxLength={1000}
                placeholder={copia.placeholderDescripcion}
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-[15px] text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-slate-400">{copia.ayudaDescripcion}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="especie" className="text-sm font-medium text-slate-50">
                {copia.etiquetaEspecie}
              </label>
              <input
                id="especie"
                type="text"
                maxLength={40}
                placeholder="Perro, gato…"
                value={especie}
                onChange={(evento) => setEspecie(evento.target.value)}
                className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-slate-400">
                Nos ayuda a avisarte automáticamente si aparece un reporte compatible en tu zona.
              </p>
            </div>
          </div>
        ) : null}

        {paso === 3 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-50">Ubicación</p>
            {estadoUbicacion === 'buscando' ? (
              <p className="text-sm text-slate-400">Buscando tu ubicación…</p>
            ) : null}
            {estadoUbicacion === 'automatica' && posicion ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-500">
                <span aria-hidden="true">📍</span>
                Usamos tu ubicación actual. Podés ajustarla tocando el mapa.
              </p>
            ) : null}
            {estadoUbicacion === 'manual' ? (
              <p className="flex items-center gap-1.5 text-sm text-slate-400">
                <span aria-hidden="true">🗺️</span>
                No pudimos obtener tu ubicación automáticamente. Tocá el mapa para marcarla.
              </p>
            ) : null}
            <SelectorUbicacionMapa
              centro={posicion ?? CENTRO_POR_DEFECTO}
              posicion={posicion}
              onSeleccionar={(latitud, longitud) => {
                setPosicion([latitud, longitud]);
                setEstadoUbicacion('manual');
              }}
            />
          </div>
        ) : null}

        {errorGeneral ? (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <span aria-hidden="true">⚠️</span>
            {errorGeneral}
          </p>
        ) : null}

        <div className="mt-2 flex gap-3">
          {paso > 1 ? (
            <button
              type="button"
              onClick={volverAlPasoAnterior}
              disabled={enviando}
              className="h-11 min-h-[44px] flex-1 rounded-md border border-slate-600 text-[15px] font-medium text-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Atrás
            </button>
          ) : null}

          {paso < 3 ? (
            <button
              type="button"
              onClick={irAlPasoSiguiente}
              disabled={estadoImagen === 'subiendo'}
              className="h-11 min-h-[44px] flex-1 rounded-md bg-blue-500 text-[15px] font-medium text-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continuar
            </button>
          ) : (
            <button
              type="submit"
              disabled={enviando || !posicion}
              className="h-11 min-h-[44px] flex-1 rounded-md bg-blue-500 text-[15px] font-medium text-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? 'Publicando…' : 'Publicar reporte'}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
