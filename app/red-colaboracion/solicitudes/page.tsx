'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { TIPOS_SOLICITUD_RECURSO_SOPORTADOS } from '@aplicacion/dtos/red-colaboracion/PublicarSolicitudRecursoDto';

const ETIQUETAS_TIPO: Record<(typeof TIPOS_SOLICITUD_RECURSO_SOPORTADOS)[number], string> = {
  transito: 'Tránsito temporal',
  insumos: 'Insumos',
  asistencia_veterinaria: 'Asistencia veterinaria',
  adopcion: 'Adopción gestionada',
};

interface SolicitudApi {
  id: string;
  organizacionId: string;
  tipo: string;
  descripcion: string;
  estado: string;
  createdAt: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

export default function PaginaSolicitudesRecurso() {
  const [solicitudes, setSolicitudes] = useState<SolicitudApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ofreciendo, setOfreciendo] = useState<string | null>(null);
  const [errorOfrecer, setErrorOfrecer] = useState<string | null>(null);
  const [ofrecidas, setOfrecidas] = useState<Set<string>>(new Set());

  const [tipo, setTipo] = useState<(typeof TIPOS_SOLICITUD_RECURSO_SOPORTADOS)[number] | ''>('');
  const [descripcion, setDescripcion] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);

  const cargarSolicitudes = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/red-colaboracion/solicitudes?porPagina=50');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as { items: SolicitudApi[] };
      setSolicitudes(datos.items);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  async function publicarSolicitud(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPublicando(true);
    setErrorPublicar(null);

    try {
      const respuesta = await fetchConSesion('/api/red-colaboracion/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, descripcion }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorPublicar(cuerpo.mensaje);
        setPublicando(false);
        return;
      }

      setTipo('');
      setDescripcion('');
      setPublicando(false);
      await cargarSolicitudes();
    } catch {
      setErrorPublicar(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setPublicando(false);
    }
  }

  async function ofrecerse(solicitudId: string) {
    setOfreciendo(solicitudId);
    setErrorOfrecer(null);

    try {
      const respuesta = await fetchConSesion(
        `/api/red-colaboracion/solicitudes/${solicitudId}/colaboraciones`,
        {
          method: 'POST',
        },
      );

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorOfrecer(cuerpo.mensaje);
        setOfreciendo(null);
        return;
      }

      setOfrecidas((actuales) => new Set(actuales).add(solicitudId));
      setOfreciendo(null);
    } catch {
      setErrorOfrecer(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setOfreciendo(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/ONGs y rescatistas.png"
          alt="Mascotas abrazadas representando a la red de colaboración"
          titulo="Solicitudes de recurso"
          descripcion="Organizaciones piden tránsito, insumos, asistencia veterinaria o adopción gestionada; rescatistas y veterinarios se ofrecen a colaborar."
        />
      </div>

      <form
        onSubmit={publicarSolicitud}
        noValidate
        className="mb-8 flex flex-col gap-3 rounded-md border border-surface2 bg-surface1/50 p-5"
      >
        <h2 className="text-base font-semibold text-text-primary">Publicar una solicitud</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo" className="text-sm font-medium text-text-primary">
            Tipo de recurso
          </label>
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Elegí una opción</option>
            {TIPOS_SOLICITUD_RECURSO_SOPORTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETAS_TIPO[valor]}
              </option>
            ))}
          </select>
        </div>
        <CampoTexto
          id="descripcion"
          label="Descripción"
          placeholder="Contanos brevemente qué necesitás…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          error={errorPublicar ?? undefined}
          required
        />
        <Boton
          type="submit"
          disabled={publicando || !tipo || !descripcion.trim()}
          className="self-start"
        >
          {publicando ? 'Publicando…' : 'Publicar solicitud'}
        </Boton>
      </form>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}
      {errorOfrecer ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {errorOfrecer}
        </p>
      ) : null}

      {solicitudes === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
      {solicitudes && solicitudes.length === 0 ? (
        <p className="text-sm text-text-muted">No hay solicitudes abiertas por el momento.</p>
      ) : null}

      {solicitudes && solicitudes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {solicitudes.map((solicitud) => (
            <li key={solicitud.id}>
              <Tarjeta className="flex items-center justify-between gap-3">
                <div>
                  <Badge tono="neutro">
                    {ETIQUETAS_TIPO[
                      solicitud.tipo as (typeof TIPOS_SOLICITUD_RECURSO_SOPORTADOS)[number]
                    ] ?? solicitud.tipo}
                  </Badge>
                  <p className="mt-1 text-sm text-text-primary">{solicitud.descripcion}</p>
                </div>
                {ofrecidas.has(solicitud.id) ? (
                  <Badge tono="exito">Te ofreciste</Badge>
                ) : (
                  <Boton
                    disabled={ofreciendo === solicitud.id}
                    onClick={() => ofrecerse(solicitud.id)}
                  >
                    {ofreciendo === solicitud.id ? 'Ofreciendo…' : 'Ofrecerme'}
                  </Boton>
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8 flex gap-4 text-sm">
        <Link
          href="/red-colaboracion/directorio"
          className="text-accent underline underline-offset-2"
        >
          Ver directorio de aliados
        </Link>
        <Link href="/red-colaboracion/buscar" className="text-accent underline underline-offset-2">
          Buscar reportes similares
        </Link>
      </div>
    </main>
  );
}
