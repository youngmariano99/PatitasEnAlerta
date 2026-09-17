'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';

interface CursoApi {
  id: string;
  titulo: string;
  descripcion: string;
  contenidoUrl: string | null;
}

interface PaginaCursosApi {
  items: CursoApi[];
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const ROLES_PUBLICAN = ['organizacion', 'municipio'];

export default function PaginaCursos() {
  const [rol, setRol] = useState<string | null>(null);
  const [cursos, setCursos] = useState<CursoApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajePorCurso, setMensajePorCurso] = useState<Record<string, string>>({});
  const [inscriptoEn, setInscriptoEn] = useState<Set<string>>(new Set());

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contenidoUrl, setContenidoUrl] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);

  const cargarCursos = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/foros-cursos/cursos');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as PaginaCursosApi;
      setCursos(datos.items);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    async function cargarPerfil() {
      try {
        const respuesta = await fetchConSesion('/api/perfil');
        if (respuesta.ok) {
          const perfil = (await respuesta.json()) as { rol: string };
          setRol(perfil.rol);
        }
      } catch {
        // El rol solo habilita el formulario de publicar — un error acá no bloquea la pantalla.
      }
    }
    cargarPerfil();
    cargarCursos();
  }, [cargarCursos]);

  async function publicarCurso(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPublicando(true);
    setErrorPublicar(null);

    try {
      const respuesta = await fetchConSesion('/api/foros-cursos/cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descripcion, contenidoUrl: contenidoUrl || undefined }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorPublicar(cuerpo.mensaje);
        setPublicando(false);
        return;
      }

      setTitulo('');
      setDescripcion('');
      setContenidoUrl('');
      setPublicando(false);
      await cargarCursos();
    } catch {
      setErrorPublicar(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setPublicando(false);
    }
  }

  async function inscribirse(curso: CursoApi) {
    setMensajePorCurso((prev) => ({ ...prev, [curso.id]: '' }));
    try {
      const respuesta = await fetchConSesion(`/api/foros-cursos/cursos/${curso.id}/inscripciones`, {
        method: 'POST',
      });
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setMensajePorCurso((prev) => ({ ...prev, [curso.id]: cuerpo.mensaje }));
        return;
      }
      setInscriptoEn((prev) => new Set(prev).add(curso.id));
      setMensajePorCurso((prev) => ({ ...prev, [curso.id]: '¡Te inscribiste!' }));
    } catch {
      setMensajePorCurso((prev) => ({
        ...prev,
        [curso.id]:
          'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      }));
    }
  }

  async function darDeBaja(curso: CursoApi) {
    setMensajePorCurso((prev) => ({ ...prev, [curso.id]: '' }));
    try {
      const respuesta = await fetchConSesion(`/api/foros-cursos/cursos/${curso.id}/inscripciones`, {
        method: 'DELETE',
      });
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setMensajePorCurso((prev) => ({ ...prev, [curso.id]: cuerpo.mensaje }));
        return;
      }
      setInscriptoEn((prev) => {
        const siguiente = new Set(prev);
        siguiente.delete(curso.id);
        return siguiente;
      });
      setMensajePorCurso((prev) => ({ ...prev, [curso.id]: 'Diste de baja tu inscripción.' }));
    } catch {
      setMensajePorCurso((prev) => ({
        ...prev,
        [curso.id]:
          'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      }));
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/ONGs y rescatistas.png"
          alt="Mascota asistiendo a un curso de tenencia responsable"
          titulo="Cursos de tenencia responsable"
          descripcion="Cursos publicados por organizaciones y el municipio."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {rol && ROLES_PUBLICAN.includes(rol) ? (
        <form
          onSubmit={publicarCurso}
          noValidate
          className="mb-8 flex flex-col gap-3 border-b border-surface2 pb-8"
        >
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Publicar un curso
          </h2>
          <CampoTexto
            id="titulo"
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
          <CampoTexto
            id="descripcion"
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />
          <CampoTexto
            id="contenidoUrl"
            label="Enlace al contenido (opcional)"
            value={contenidoUrl}
            onChange={(e) => setContenidoUrl(e.target.value)}
            error={errorPublicar ?? undefined}
          />
          <Boton type="submit" disabled={publicando || !titulo.trim() || !descripcion.trim()}>
            {publicando ? 'Publicando…' : 'Publicar curso'}
          </Boton>
        </form>
      ) : null}

      {cursos === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
      {cursos && cursos.length === 0 ? (
        <p className="text-sm text-text-muted">Todavía no hay cursos publicados.</p>
      ) : null}

      {cursos && cursos.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {cursos.map((curso) => (
            <li key={curso.id}>
              <Tarjeta className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{curso.titulo}</p>
                    <p className="text-sm text-text-muted">{curso.descripcion}</p>
                    {curso.contenidoUrl ? (
                      <a
                        href={curso.contenidoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent underline-offset-2 hover:underline"
                      >
                        Ver contenido
                      </a>
                    ) : null}
                  </div>
                  {inscriptoEn.has(curso.id) ? (
                    <Boton variante="texto" onClick={() => darDeBaja(curso)}>
                      Darme de baja
                    </Boton>
                  ) : (
                    <Boton variante="secundaria" onClick={() => inscribirse(curso)}>
                      Inscribirme
                    </Boton>
                  )}
                </div>
                {mensajePorCurso[curso.id] ? (
                  <p className="text-sm text-text-muted">{mensajePorCurso[curso.id]}</p>
                ) : null}
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
