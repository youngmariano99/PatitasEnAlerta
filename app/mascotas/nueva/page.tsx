'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

type EstadoImagen = 'sin_seleccionar' | 'subiendo' | 'lista' | 'error';

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

export default function PaginaNuevaMascota() {
  const router = useRouter();
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState('');
  const [raza, setRaza] = useState('');
  const [edadAproximada, setEdadAproximada] = useState('');
  const [identificacionChip, setIdentificacionChip] = useState('');

  const [estadoImagen, setEstadoImagen] = useState<EstadoImagen>('sin_seleccionar');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

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

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);

    if (!fotoUrl) {
      setErrorImagen('Necesitamos al menos una foto de tu mascota para completar el registro.');
      return;
    }
    if (!nombre.trim() || !especie.trim()) {
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch('/api/mascotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          especie,
          fotoUrl,
          raza: raza || undefined,
          edadAproximada: edadAproximada ? Number(edadAproximada) : undefined,
          identificacionChip: identificacionChip || undefined,
        }),
      });

      if (respuesta.status === 201) {
        router.push('/mascotas');
        return;
      }

      const cuerpo = (await respuesta.json()) as RespuestaError;
      if (cuerpo.codigo === 'PEA-AUTH-010') {
        setErrorImagen(cuerpo.mensaje);
      } else {
        setErrorGeneral(cuerpo.mensaje);
      }
      setEnviando(false);
    } catch {
      setErrorGeneral('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      setEnviando(false);
    }
  }

  // La foto NO forma parte de esta validación a propósito: el submit tiene
  // que quedar clickeable sin foto para poder mostrar el error ⚠️ en el
  // campo de imagen (criterio de aceptación), en vez de un botón
  // deshabilitado que nunca explica por qué.
  const camposDeTextoCompletos = nombre.trim().length > 0 && especie.trim().length > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Registrá a tu mascota</h1>
      <p className="mb-6 text-sm text-slate-400">
        Solo necesitamos lo básico: nombre, especie y una foto. Podés completar el resto más adelante.
      </p>

      <form onSubmit={manejarEnvio} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="foto" className="text-sm font-medium text-slate-50">
            Foto
          </label>
          <input
            ref={inputArchivoRef}
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
              alt="Vista previa de la foto de tu mascota"
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

        <CampoTexto
          id="nombre"
          label="Nombre"
          placeholder="Toby"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          required
        />

        <CampoTexto
          id="especie"
          label="Especie"
          placeholder="Perro, gato, conejo…"
          value={especie}
          onChange={(evento) => setEspecie(evento.target.value)}
          required
        />

        <CampoTexto
          id="raza"
          label="Raza (opcional)"
          placeholder="Mestizo"
          value={raza}
          onChange={(evento) => setRaza(evento.target.value)}
        />

        <CampoTexto
          id="edadAproximada"
          label="Edad aproximada en años (opcional)"
          type="number"
          min={0}
          placeholder="3"
          value={edadAproximada}
          onChange={(evento) => setEdadAproximada(evento.target.value)}
        />

        <CampoTexto
          id="identificacionChip"
          label="Número de chip (opcional)"
          placeholder="Si tu mascota tiene chip identificatorio"
          value={identificacionChip}
          onChange={(evento) => setIdentificacionChip(evento.target.value)}
        />

        {errorGeneral ? (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <span aria-hidden="true">⚠️</span>
            {errorGeneral}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enviando || estadoImagen === 'subiendo' || !camposDeTextoCompletos}
          className="mt-2 h-11 min-h-[44px] rounded-md bg-blue-500 text-[15px] font-medium text-slate-50 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Registrando…' : 'Registrar mascota'}
        </button>
      </form>
    </main>
  );
}
