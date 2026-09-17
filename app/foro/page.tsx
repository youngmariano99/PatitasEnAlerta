'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';

interface TemaApi {
  id: string;
  creadoPor: string;
  titulo: string;
  contenido: string;
  createdAt: string;
}

interface PaginaTemasApi {
  items: TemaApi[];
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

export default function PaginaForo() {
  const [temas, setTemas] = useState<TemaApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);

  const cargarTemas = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/foros-cursos/temas');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as PaginaTemasApi;
      setTemas(datos.items);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarTemas();
  }, [cargarTemas]);

  async function publicarTema(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPublicando(true);
    setErrorPublicar(null);

    try {
      const respuesta = await fetchConSesion('/api/foros-cursos/temas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, contenido }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorPublicar(cuerpo.mensaje);
        setPublicando(false);
        return;
      }

      setTitulo('');
      setContenido('');
      setPublicando(false);
      await cargarTemas();
    } catch {
      setErrorPublicar(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setPublicando(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/ONGs y rescatistas.png"
          alt="Mascota participando de una charla comunitaria"
          titulo="Foro de bienestar animal"
          descripcion="Compartí y consultá contenido educativo sobre tenencia responsable."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      <form
        onSubmit={publicarTema}
        noValidate
        className="mb-8 flex flex-col gap-3 border-b border-surface2 pb-8"
      >
        <h2 className="font-display text-lg font-semibold text-text-primary">Publicar un tema</h2>
        <CampoTexto
          id="titulo"
          label="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
        <CampoTexto
          id="contenido"
          label="Contenido"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          error={errorPublicar ?? undefined}
          required
        />
        <Boton type="submit" disabled={publicando || !titulo.trim() || !contenido.trim()}>
          {publicando ? 'Publicando…' : 'Publicar tema'}
        </Boton>
      </form>

      {temas === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
      {temas && temas.length === 0 ? (
        <p className="text-sm text-text-muted">Todavía no hay temas publicados.</p>
      ) : null}

      {temas && temas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {temas.map((tema) => (
            <li key={tema.id}>
              <Link href={`/foro/${tema.id}`}>
                <Tarjeta>
                  <p className="font-medium text-text-primary">{tema.titulo}</p>
                  <p className="line-clamp-2 text-sm text-text-muted">{tema.contenido}</p>
                </Tarjeta>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
