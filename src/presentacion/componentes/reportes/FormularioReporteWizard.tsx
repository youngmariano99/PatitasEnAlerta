'use client';

import { useEffect, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  SUBTIPOS_PROBLEMATICA_SOPORTADOS,
  type SubtipoProblematica,
  type TipoReporte,
} from '@aplicacion/dtos/reportes/CrearReporteDto';
import { crearClienteSupabaseNavegador } from '@infraestructura/adaptadores/ClienteSupabaseNavegador';
import {
  ResultadosCercanosTrasPublicar,
  type ResultadoCercano,
} from '@presentacion/componentes/reportes/ResultadosCercanosTrasPublicar';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false es
// obligatorio (no un simple import estático) para que Next.js no intente
// renderizarlo en el servidor.
const SelectorUbicacionMapa = dynamic(
  () =>
    import('@presentacion/componentes/mapas/SelectorUbicacionMapa').then(
      (mod) => mod.SelectorUbicacionMapa,
    ),
  { ssr: false, loading: () => <p className="text-sm text-text-muted">Cargando mapa…</p> },
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
type EspecieCategoria = 'perro' | 'gato' | 'otro' | '';

interface CopiaPorTipo {
  titulo: string;
  bajada: string;
  etiquetaFoto: string;
  placeholderDescripcion: string;
  ayudaDescripcion: string;
  etiquetaEspecie: string;
}

/**
 * Único punto donde el texto difiere entre REP-01 ('perdido'), REP-02
 * ('encontrado') y REP-03 ('problematica') — todo lo demás (validación,
 * pasos, componentes) es exactamente el mismo flujo (ver CrearReporte.ts,
 * "un único caso de uso cubre los tres tipos").
 */
const COPIA_POR_TIPO: Record<TipoReporte, CopiaPorTipo> = {
  perdido: {
    titulo: 'Reportá tu mascota perdida',
    bajada:
      'Reportar protege. Cuanto antes lo publiques, más vecinos pueden ayudarte a encontrarla.',
    etiquetaFoto: 'Foto de tu mascota',
    placeholderDescripcion: 'Se perdió cerca de la plaza, responde a su nombre, es muy sociable…',
    ayudaDescripcion: 'Contá dónde y cuándo la viste por última vez.',
    etiquetaEspecie: 'Especie de tu mascota (opcional)',
  },
  encontrado: {
    titulo: 'Reportá una mascota encontrada',
    bajada: 'Gracias por avisar. Publicarlo ayuda a que su familia la encuentre lo antes posible.',
    etiquetaFoto: 'Foto de la mascota que encontraste',
    placeholderDescripcion: 'La encontré deambulando sola cerca de la plaza, parece perdida…',
    ayudaDescripcion: 'Contá dónde y cuándo la encontraste.',
    etiquetaEspecie: 'Especie del animal (opcional)',
  },
  problematica: {
    titulo: 'Reportá una problemática urbana',
    bajada:
      'Municipio recibe tu reporte para actuar sobre animales sueltos, focos sanitarios o accidentes viales.',
    etiquetaFoto: 'Foto de la situación',
    placeholderDescripcion:
      'Hay un perro suelto en la esquina, sin dueño a la vista, riesgo para el tránsito…',
    ayudaDescripcion: 'Contá dónde y cuándo ocurrió.',
    etiquetaEspecie: 'Especie del animal involucrado, si aplica (opcional)',
  },
};

const ETIQUETAS_SUBTIPO: Record<SubtipoProblematica, string> = {
  animal_suelto: 'Animal suelto',
  foco_sanitario: 'Foco sanitario',
  accidente_vial: 'Accidente vial',
};

const SEPARADOR_CARACTERISTICAS = '\n\nCaracterísticas: ';

/** Concatena los dos campos del paso 2 en el único `descripcion` que espera el backend — sin cambio de DTO, ver docstring del wizard. */
function construirDescripcion(quePaso: string, caracteristicas: string): string {
  const base = quePaso.trim();
  const extra = caracteristicas.trim();
  return extra ? `${base}${SEPARADOR_CARACTERISTICAS}${extra}` : base;
}

interface RespuestaGeocodificacion {
  direccionCorta: string;
  provincia: string | null;
  pais: string | null;
}

interface RespuestaListadoReportes {
  items: ResultadoCercano[];
}

/**
 * Adjunta `context=usuario_id=<id>` a la subida — metadata que
 * ValidadorContenidoImagen.ts (vía CloudinaryStorageAdapter.fueSubidaPor)
 * lee del lado del servidor con el Admin API para confirmar que la
 * `fotoUrl` que llega en el POST /api/reportes realmente la subió quien
 * dice reportar, y no la URL de la foto de un reporte ajeno. Requiere sesión
 * activa: esta página ya está protegida por middleware.ts, así que llegar
 * acá sin `user` sería un estado inesperado, no un flujo normal a manejar
 * en silencio.
 */
async function subirImagenACloudinary(archivo: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary no está configurado en este entorno.');
  }

  const supabase = crearClienteSupabaseNavegador();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Necesitás iniciar sesión para subir una foto.');
  }

  const formData = new FormData();
  formData.append('file', archivo);
  formData.append('upload_preset', uploadPreset);
  formData.append('context', `usuario_id=${user.id}`);

  const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!respuesta.ok) {
    // Cloudinary devuelve el motivo real en el body (ej. "Upload preset not
    // found" si NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET no existe o no es
    // unsigned) — se loguea acá (nunca se muestra tal cual al usuario, que
    // ve el mensaje genérico de abajo) para poder diagnosticar sin adivinar.
    const cuerpo = await respuesta.json().catch(() => null);
    console.error('Cloudinary rechazó la subida', respuesta.status, cuerpo);
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
 * Wizard de 3 pasos (foto → descripción/especie[/subtipo] → ubicación +
 * publicar) compartido por REP-01 (mascota perdida), REP-02 (mascota
 * encontrada) y REP-03 (problemática urbana, Módulo 2). `tipoInicial` es el
 * parámetro que cambia el comportamiento — mismo componente, mismo endpoint
 * POST /api/reportes, mismo caso de uso CrearReporte del lado del servidor.
 * Para 'problematica' el paso 2 agrega el selector visual de `subtipo`
 * (radiogroup, nunca texto libre — NFR de validación estricta) y el paso no
 * avanza sin una selección.
 *
 * Tras publicar un reporte 'perdido'/'encontrado' (no 'problematica', no
 * aplica), el wizard no redirige de inmediato — pasa a un estado terminal
 * que muestra reportes del tipo opuesto cerca de la misma zona (ver
 * `ResultadosCercanosTrasPublicar.tsx`), para no distraer a quien está
 * reportando mientras completa el formulario.
 */
export function FormularioReporteWizard({ tipoInicial }: FormularioReporteWizardProps) {
  const router = useRouter();
  const copia = COPIA_POR_TIPO[tipoInicial];
  const esProblematica = tipoInicial === 'problematica';

  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const [estadoImagen, setEstadoImagen] = useState<EstadoImagen>('sin_seleccionar');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  const [quePaso, setQuePaso] = useState('');
  const [caracteristicas, setCaracteristicas] = useState('');
  const [especieCategoria, setEspecieCategoria] = useState<EspecieCategoria>('');
  const [especieOtro, setEspecieOtro] = useState('');
  const [subtipo, setSubtipo] = useState<SubtipoProblematica | null>(null);
  const [errorSubtipo, setErrorSubtipo] = useState<string | null>(null);

  const [estadoUbicacion, setEstadoUbicacion] = useState<EstadoUbicacion>('buscando');
  const [posicion, setPosicion] = useState<[number, number] | null>(null);
  const [geocodificando, setGeocodificando] = useState(false);
  const [direccionSugerida, setDireccionSugerida] = useState<string | null>(null);
  const [provincia, setProvincia] = useState('');
  const [pais, setPais] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const [mostrarResultadosCercanos, setMostrarResultadosCercanos] = useState(false);
  const [resultadosCercanos, setResultadosCercanos] = useState<ResultadoCercano[]>([]);
  const [cargandoResultadosCercanos, setCargandoResultadosCercanos] = useState(false);

  const especieFinal = especieCategoria === 'otro' ? especieOtro.trim() : especieCategoria;

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

  // Geocodificación inversa: dispara tanto con la ubicación automática como
  // con un click manual en el mapa (ambos cargan `posicion`) — le muestra al
  // usuario una confirmación legible de dónde está marcando, y precarga
  // provincia/país (solo como ayuda visual, nunca se envían al backend: ver
  // docstring de ResultadosCercanosTrasPublicar y el plan de esta feature).
  useEffect(() => {
    if (!posicion) return;
    let cancelado = false;
    setGeocodificando(true);
    fetch(`/api/geocoding/reverse?lat=${posicion[0]}&lon=${posicion[1]}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: RespuestaGeocodificacion | null) => {
        if (cancelado) return;
        setDireccionSugerida(datos?.direccionCorta ?? null);
        setProvincia(datos?.provincia ?? '');
        setPais(datos?.pais ?? '');
      })
      .catch(() => {
        if (!cancelado) setDireccionSugerida(null);
      })
      .finally(() => {
        if (!cancelado) setGeocodificando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [posicion]);

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
    } catch (error) {
      setEstadoImagen('error');
      // El mensaje del error ya viene en español y listo para mostrar (ver
      // subirImagenACloudinary) — mostrarlo tal cual en vez de uno genérico
      // fijo, y loguearlo: antes acá se perdía la causa real (ej. Cloudinary
      // sin configurar en .env) sin dejar rastro ni en pantalla ni en consola.
      const mensaje =
        error instanceof Error ? error.message : 'No pudimos subir la imagen. Probá de nuevo.';
      setErrorImagen(mensaje);
      console.error('No se pudo subir la foto del reporte a Cloudinary', error);
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
      if (esProblematica && !subtipo) {
        setErrorSubtipo('Elegí un motivo para tu reporte de problemática.');
        return;
      }
      if (!quePaso.trim()) return;
      setPaso(3);
    }
  }

  function volverAlPasoAnterior() {
    setPaso((actual) => (actual > 1 ? ((actual - 1) as 1 | 2) : actual));
  }

  async function cargarResultadosCercanos(latitud: number, longitud: number) {
    const tipoOpuesto = tipoInicial === 'perdido' ? 'encontrado' : 'perdido';
    setMostrarResultadosCercanos(true);
    setCargandoResultadosCercanos(true);
    try {
      const params = new URLSearchParams({
        tipo: tipoOpuesto,
        estado: 'reportado',
        latitud: String(latitud),
        longitud: String(longitud),
        radioKm: '10',
        porPagina: '6',
      });
      const respuesta = await fetch(`/api/reportes?${params.toString()}`);
      const datos: RespuestaListadoReportes = respuesta.ok ? await respuesta.json() : { items: [] };
      // GET /api/reportes no filtra por especie — se filtra acá, mismo
      // criterio que MapaComunidad.tsx para sus marcadores.
      const especieBuscada = especieFinal ? especieFinal.toLowerCase() : null;
      const items = especieBuscada
        ? datos.items.filter((item) => item.especie?.toLowerCase() === especieBuscada)
        : datos.items;
      setResultadosCercanos(items);
    } catch {
      setResultadosCercanos([]);
    } finally {
      setCargandoResultadosCercanos(false);
    }
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);
    const descripcionCombinada = construirDescripcion(quePaso, caracteristicas);
    if (!fotoUrl || !descripcionCombinada || !posicion) return;
    if (esProblematica && !subtipo) return;

    setEnviando(true);
    try {
      const respuesta = await fetch('/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoInicial,
          subtipo: esProblematica ? subtipo : undefined,
          descripcion: descripcionCombinada,
          fotoUrl,
          latitud: posicion[0],
          longitud: posicion[1],
          especie: especieFinal || undefined,
        }),
      });

      if (respuesta.status === 201) {
        setEnviando(false);
        if (esProblematica) {
          router.push('/reportes');
          return;
        }
        await cargarResultadosCercanos(posicion[0], posicion[1]);
        return;
      }

      const cuerpo = (await respuesta.json()) as RespuestaError;
      setErrorGeneral(cuerpo.mensaje);
      setEnviando(false);
    } catch {
      setErrorGeneral(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setEnviando(false);
    }
  }

  if (mostrarResultadosCercanos) {
    const tipoOpuesto = tipoInicial === 'perdido' ? 'encontrado' : 'perdido';
    return (
      <ResultadosCercanosTrasPublicar
        tipoOpuesto={tipoOpuesto}
        resultados={resultadosCercanos}
        cargando={cargandoResultadosCercanos}
        onIrAlListado={() => router.push('/reportes')}
      />
    );
  }

  return (
    // Sin `min-h-screen`/`justify-center`: este componente ya no es el único
    // contenido de la pantalla (app/reportes/nuevo/page.tsx le agrega un
    // encabezado ilustrado y el selector de categoría arriba) — centrarlo
    // verticalmente en la altura completa del viewport dejaba un salto vacío
    // enorme entre esos elementos y el "Paso 1 de 3".
    <main className="mx-auto max-w-md px-6 pb-12 pt-6 text-text-primary">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">
        Paso {paso} de 3
      </p>
      <h1 className="mb-1 text-xl font-semibold">{copia.titulo}</h1>
      <p className="mb-6 text-sm text-text-muted">{copia.bajada}</p>

      <form onSubmit={manejarEnvio} noValidate className="flex flex-col gap-4">
        {paso === 1 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="foto" className="text-sm font-medium text-text-primary">
              {copia.etiquetaFoto}
            </label>
            <input
              id="foto"
              type="file"
              accept="image/*"
              onChange={manejarSeleccionDeImagen}
              className="text-sm text-text-muted file:mr-3 file:h-11 file:min-h-[44px] file:rounded-md file:border-0 file:bg-accent file:px-4 file:text-text-primary"
              aria-invalid={Boolean(errorImagen)}
              aria-describedby={errorImagen ? 'foto-error' : undefined}
            />
            {previewLocal ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewLocal}
                alt="Vista previa de la foto del reporte"
                className="mt-1 h-32 w-32 rounded-md border border-surface2 object-cover"
              />
            ) : null}
            {estadoImagen === 'subiendo' ? (
              <p className="text-sm text-text-muted">Subiendo imagen…</p>
            ) : null}
            {errorImagen ? (
              <p id="foto-error" className="flex items-center gap-1.5 text-sm text-danger">
                <span aria-hidden="true">⚠️</span>
                {errorImagen}
              </p>
            ) : null}
          </div>
        ) : null}

        {paso === 2 ? (
          <div className="flex flex-col gap-4">
            {esProblematica ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text-primary" id="subtipo-label">
                  ¿De qué se trata?
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="subtipo-label"
                  aria-invalid={Boolean(errorSubtipo)}
                  aria-describedby={errorSubtipo ? 'subtipo-error' : undefined}
                  className="flex flex-wrap gap-2"
                >
                  {SUBTIPOS_PROBLEMATICA_SOPORTADOS.map((valor) => {
                    const seleccionado = subtipo === valor;
                    return (
                      <button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={seleccionado}
                        onClick={() => {
                          setSubtipo(valor);
                          setErrorSubtipo(null);
                        }}
                        className={
                          seleccionado
                            ? 'h-11 min-h-[44px] rounded-md border border-accent bg-accent px-4 text-[15px] font-medium text-text-primary'
                            : 'h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-4 text-[15px] font-medium text-text-primary'
                        }
                      >
                        {ETIQUETAS_SUBTIPO[valor]}
                      </button>
                    );
                  })}
                </div>
                {errorSubtipo ? (
                  <p id="subtipo-error" className="flex items-center gap-1.5 text-sm text-danger">
                    <span aria-hidden="true">⚠️</span>
                    {errorSubtipo}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="quePaso" className="text-sm font-medium text-text-primary">
                ¿Qué pasó?
              </label>
              <textarea
                id="quePaso"
                rows={4}
                maxLength={600}
                placeholder={copia.placeholderDescripcion}
                value={quePaso}
                onChange={(evento) => setQuePaso(evento.target.value)}
                className="rounded-md border border-surface2 bg-surface1 px-3 py-2 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-sm text-text-muted">{copia.ayudaDescripcion}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="caracteristicas" className="text-sm font-medium text-text-primary">
                Características (opcional)
              </label>
              <textarea
                id="caracteristicas"
                rows={3}
                maxLength={400}
                placeholder="Color, tamaño, señas particulares…"
                value={caracteristicas}
                onChange={(evento) => setCaracteristicas(evento.target.value)}
                className="rounded-md border border-surface2 bg-surface1 px-3 py-2 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-sm text-text-muted">
                Sumá detalles si la foto no los muestra bien, o si todavía no subiste una foto.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="especie-categoria" className="text-sm font-medium text-text-primary">
                {copia.etiquetaEspecie}
              </label>
              <select
                id="especie-categoria"
                value={especieCategoria}
                onChange={(evento) => setEspecieCategoria(evento.target.value as EspecieCategoria)}
                className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Preferís no decir</option>
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="otro">Otro</option>
              </select>
              {especieCategoria === 'otro' ? (
                <input
                  id="especie-otro"
                  type="text"
                  maxLength={40}
                  placeholder="¿Qué especie?"
                  value={especieOtro}
                  onChange={(evento) => setEspecieOtro(evento.target.value)}
                  className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  aria-label="Especificá la especie"
                />
              ) : null}
              <p className="text-sm text-text-muted">
                Nos ayuda a avisarte automáticamente si aparece un reporte compatible en tu zona.
              </p>
            </div>
          </div>
        ) : null}

        {paso === 3 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-text-primary">Ubicación</p>
            {estadoUbicacion === 'buscando' ? (
              <p className="text-sm text-text-muted">Buscando tu ubicación…</p>
            ) : null}
            {estadoUbicacion === 'automatica' && posicion ? (
              <p className="flex items-center gap-1.5 text-sm text-success">
                <span aria-hidden="true">📍</span>
                Usamos tu ubicación actual. Podés ajustarla tocando el mapa.
              </p>
            ) : null}
            {estadoUbicacion === 'manual' ? (
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
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

            {geocodificando ? (
              <p className="text-sm text-text-muted">Buscando la dirección…</p>
            ) : null}
            {!geocodificando && direccionSugerida ? (
              <p className="flex items-start gap-1.5 text-sm text-text-muted">
                <span aria-hidden="true">📍</span>
                Estás marcando: {direccionSugerida}
              </p>
            ) : null}

            {posicion ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="provincia" className="text-sm font-medium text-text-primary">
                    Provincia
                  </label>
                  <input
                    id="provincia"
                    type="text"
                    value={provincia}
                    onChange={(evento) => setProvincia(evento.target.value)}
                    className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pais" className="text-sm font-medium text-text-primary">
                    País
                  </label>
                  <input
                    id="pais"
                    type="text"
                    value={pais}
                    onChange={(evento) => setPais(evento.target.value)}
                    className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {errorGeneral ? (
          <p className="flex items-center gap-1.5 text-sm text-danger">
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
              className="h-11 min-h-[44px] flex-1 rounded-md border border-surface2 text-[15px] font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Atrás
            </button>
          ) : null}

          {paso < 3 ? (
            <button
              type="button"
              onClick={irAlPasoSiguiente}
              disabled={estadoImagen === 'subiendo'}
              className="h-11 min-h-[44px] flex-1 rounded-md bg-accent text-[15px] font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continuar
            </button>
          ) : (
            <button
              type="submit"
              disabled={enviando || !posicion}
              className="h-11 min-h-[44px] flex-1 rounded-md bg-accent text-[15px] font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? 'Publicando…' : 'Publicar reporte'}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
