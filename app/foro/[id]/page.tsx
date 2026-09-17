'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
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

interface RespuestaApi {
  id: string;
  temaId: string;
  usuarioId: string;
  contenido: string;
  createdAt: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

export default function PaginaTemaForo() {
  const { id } = useParams<{ id: string }>();

  const [tema, setTema] = useState<TemaApi | null>(null);
  const [respuestas, setRespuestas] = useState<RespuestaApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [moderado, setModerado] = useState(false);

  const [contenido, setContenido] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [respuestaTemas, respuestaRespuestas] = await Promise.all([
        fetchConSesion('/api/foros-cursos/temas?porPagina=50'),
        fetchConSesion(`/api/foros-cursos/temas/${id}/respuestas`),
      ]);

      if (respuestaTemas.ok) {
        const pagina = (await respuestaTemas.json()) as { items: TemaApi[] };
        setTema(pagina.items.find((t) => t.id === id) ?? null);
      }

      if (!respuestaRespuestas.ok) {
        const cuerpo = (await respuestaRespuestas.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      setRespuestas((await respuestaRespuestas.json()) as RespuestaApi[]);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, [id]);

  useEffect(() => {
    async function cargarPerfil() {
      try {
        const respuesta = await fetchConSesion('/api/perfil');
        if (respuesta.ok) {
          const perfil = (await respuesta.json()) as { rol: string };
          setRol(perfil.rol);
        }
      } catch {
        // El rol solo habilita el botón de moderar — un error acá no bloquea la pantalla.
      }
    }
    cargarPerfil();
    cargarDatos();
  }, [cargarDatos]);

  async function responder(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPublicando(true);
    setErrorPublicar(null);

    try {
      const respuesta = await fetchConSesion(`/api/foros-cursos/temas/${id}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorPublicar(cuerpo.mensaje);
        setPublicando(false);
        return;
      }

      setContenido('');
      setPublicando(false);
      await cargarDatos();
    } catch {
      setErrorPublicar(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setPublicando(false);
    }
  }

  async function moderarTema() {
    const respuesta = await fetchConSesion(`/api/foros-cursos/temas/${id}/moderar`, {
      method: 'POST',
    });
    if (respuesta.ok) {
      setModerado(true);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {tema ? (
        <div className="mb-6">
          <EncabezadoIlustrado
            imagenSrc="/animales/ONGs y rescatistas.png"
            alt="Mascota leyendo un tema del foro"
            titulo={tema.titulo}
            descripcion={tema.contenido}
          />
          {rol === 'administrador' && !moderado ? (
            <Boton variante="texto" onClick={moderarTema} className="mt-2">
              Moderar (contenido inapropiado)
            </Boton>
          ) : null}
          {moderado ? <p className="mt-2 text-sm text-danger">Este tema fue moderado.</p> : null}
        </div>
      ) : null}

      <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Respuestas</h2>
      {respuestas === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
      {respuestas && respuestas.length === 0 ? (
        <p className="text-sm text-text-muted">
          Todavía no hay respuestas. Sé el primero en responder.
        </p>
      ) : null}

      {respuestas && respuestas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {respuestas.map((respuesta) => (
            <li key={respuesta.id}>
              <Tarjeta>
                <p className="text-sm text-text-primary">{respuesta.contenido}</p>
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        onSubmit={responder}
        noValidate
        className="mt-6 flex flex-col gap-3 border-t border-surface2 pt-6"
      >
        <CampoTexto
          id="contenido"
          label="Tu respuesta"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          error={errorPublicar ?? undefined}
          required
        />
        <Boton type="submit" disabled={publicando || !contenido.trim()}>
          {publicando ? 'Publicando…' : 'Responder'}
        </Boton>
      </form>
    </main>
  );
}
