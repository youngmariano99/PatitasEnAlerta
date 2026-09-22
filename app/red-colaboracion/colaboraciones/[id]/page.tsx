'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';

interface HistorialItemApi {
  id: string;
  estadoAnterior: string;
  estadoNuevo: string;
  usuarioId: string;
  registradoEn: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  propuesta: 'Propuesta',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  completada: 'Completada',
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PaginaSeguimientoColaboracion() {
  const params = useParams<{ id: string }>();
  const [historial, setHistorial] = useState<HistorialItemApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  const cargarHistorial = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion(
        `/api/red-colaboracion/colaboraciones/${params.id}/historial`,
      );
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as HistorialItemApi[];
      setHistorial(datos);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, [params.id]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  async function cambiarEstado(estado: 'aceptada' | 'rechazada' | 'completada') {
    setActualizando(estado);
    setErrorEstado(null);

    try {
      const respuesta = await fetchConSesion(
        `/api/red-colaboracion/colaboraciones/${params.id}/estado`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado }),
        },
      );

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorEstado(cuerpo.mensaje);
        setActualizando(null);
        return;
      }

      setActualizando(null);
      await cargarHistorial();
    } catch {
      setErrorEstado(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setActualizando(null);
    }
  }

  const estadoActual =
    historial && historial.length > 0 ? historial[historial.length - 1]!.estadoNuevo : 'propuesta';

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/ONGs y rescatistas.png"
          alt="Mascotas abrazadas representando a la red de colaboración"
          titulo="Seguimiento de colaboración"
          descripcion="Historial de estados de este hilo de coordinación."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}
      {errorEstado ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {errorEstado}
        </p>
      ) : null}

      {historial ? (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-text-muted">Estado actual:</span>
          <Badge
            tono={
              estadoActual === 'completada'
                ? 'exito'
                : estadoActual === 'rechazada'
                  ? 'peligro'
                  : 'neutro'
            }
          >
            {ETIQUETAS_ESTADO[estadoActual] ?? estadoActual}
          </Badge>
        </div>
      ) : null}

      {historial && (estadoActual === 'propuesta' || estadoActual === 'aceptada') ? (
        <div className="mb-6 flex gap-2">
          {estadoActual === 'propuesta' ? (
            <>
              <Boton
                disabled={actualizando === 'aceptada'}
                onClick={() => cambiarEstado('aceptada')}
              >
                Aceptar
              </Boton>
              <Boton
                variante="secundaria"
                disabled={actualizando === 'rechazada'}
                onClick={() => cambiarEstado('rechazada')}
              >
                Rechazar
              </Boton>
            </>
          ) : null}
          {estadoActual === 'aceptada' ? (
            <Boton
              disabled={actualizando === 'completada'}
              onClick={() => cambiarEstado('completada')}
            >
              Marcar como completada
            </Boton>
          ) : null}
        </div>
      ) : null}

      {historial === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}

      {historial && historial.length > 0 ? (
        <ul className="flex flex-col gap-2 border-l border-surface2 pl-4">
          {historial.map((item) => (
            <li key={item.id}>
              <Tarjeta>
                <p className="text-sm text-text-primary">
                  {ETIQUETAS_ESTADO[item.estadoAnterior] ?? item.estadoAnterior} →{' '}
                  {ETIQUETAS_ESTADO[item.estadoNuevo] ?? item.estadoNuevo}
                </p>
                <p className="font-mono text-xs text-text-muted">
                  {formatearFecha(item.registradoEn)}
                </p>
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
