'use client';

import { useCallback, useEffect, useState } from 'react';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';

interface VerificacionPendienteApi {
  id: string;
  usuarioId: string;
  tipo: 'veterinario' | 'municipio';
  email: string;
  createdAt: string;
  matricula: string | null;
  colegioEmisor: string | null;
  nombreInstitucional: string | null;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const POR_PAGINA = 50;

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function detalleSolicitante(fila: VerificacionPendienteApi): string {
  if (fila.tipo === 'veterinario') {
    return `Matrícula ${fila.matricula ?? '—'} · ${fila.colegioEmisor ?? '—'}`;
  }
  return fila.nombreInstitucional ?? '—';
}

export default function PaginaVerificacionesPendientes() {
  const [verificaciones, setVerificaciones] = useState<VerificacionPendienteApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoPorId, setMotivoPorId] = useState<Record<string, string>>({});
  const [tocadoMotivoId, setTocadoMotivoId] = useState<string | null>(null);
  const [accionEnCursoId, setAccionEnCursoId] = useState<string | null>(null);
  const [errorPorId, setErrorPorId] = useState<Record<string, string>>({});

  const cargarPagina = useCallback(async (paginaSolicitada: number) => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const respuesta = await fetch(`/api/admin/verificaciones?pagina=${paginaSolicitada}&porPagina=${POR_PAGINA}`);
      if (respuesta.status === 401 || respuesta.status === 403) {
        setErrorCarga('No tenés permiso para ver este panel.');
        return;
      }
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorCarga(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as { items: VerificacionPendienteApi[]; total: number; pagina: number };
      setVerificaciones(datos.items);
      setTotal(datos.total);
      setPagina(datos.pagina);
    } catch {
      setErrorCarga('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPagina(1);
  }, [cargarPagina]);

  async function resolver(id: string, decision: 'aprobado' | 'rechazado', motivoRechazo?: string) {
    setAccionEnCursoId(id);
    setErrorPorId((prev) => ({ ...prev, [id]: '' }));

    try {
      const respuesta = await fetch(`/api/admin/verificaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision === 'rechazado' ? { decision, motivoRechazo } : { decision }),
      });

      if (respuesta.status === 200) {
        setVerificaciones((prev) => prev.filter((fila) => fila.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
        setRechazandoId(null);
        return;
      }

      const cuerpo = (await respuesta.json()) as RespuestaError;
      setErrorPorId((prev) => ({ ...prev, [id]: cuerpo.mensaje }));
    } catch {
      setErrorPorId((prev) => ({ ...prev, [id]: 'No pudimos conectarnos con el servidor. Intentá de nuevo.' }));
    } finally {
      setAccionEnCursoId(null);
    }
  }

  function confirmarRechazo(id: string) {
    setTocadoMotivoId(id);
    const motivo = motivoPorId[id]?.trim();
    if (!motivo) return;
    resolver(id, 'rechazado', motivo);
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  if (errorCarga) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12 text-slate-50">
        <p className="flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {errorCarga}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Verificaciones pendientes</h1>
      <p className="mb-6 text-sm text-slate-400">
        Revisá la matrícula o los datos institucionales antes de aprobar o rechazar cada cuenta.
      </p>

      {cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}

      {!cargando && verificaciones.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
          No hay verificaciones pendientes en este momento.
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {verificaciones.map((fila) => (
          <li key={fila.id} className="rounded-md border border-slate-700 bg-slate-800 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-50">{fila.email}</p>
                <p className="text-sm text-slate-400">{detalleSolicitante(fila)}</p>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  {fila.tipo} · solicitado el {formatearFecha(fila.createdAt)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => resolver(fila.id, 'aprobado')}
                  disabled={accionEnCursoId === fila.id}
                  className="h-11 min-h-[44px] rounded-md bg-emerald-500 px-4 text-[15px] font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  onClick={() => setRechazandoId(rechazandoId === fila.id ? null : fila.id)}
                  disabled={accionEnCursoId === fila.id}
                  className="h-11 min-h-[44px] rounded-md border border-red-500 px-4 text-[15px] font-medium text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>

            {rechazandoId === fila.id ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-700 pt-3">
                <CampoTexto
                  id={`motivo-${fila.id}`}
                  label="Motivo del rechazo"
                  placeholder="Ej: la matrícula no figura en el padrón del colegio"
                  value={motivoPorId[fila.id] ?? ''}
                  onChange={(evento) => setMotivoPorId((prev) => ({ ...prev, [fila.id]: evento.target.value }))}
                  onBlur={() => setTocadoMotivoId(fila.id)}
                  error={tocadoMotivoId === fila.id && !motivoPorId[fila.id]?.trim() ? 'Ingresá el motivo del rechazo.' : undefined}
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => confirmarRechazo(fila.id)}
                    disabled={accionEnCursoId === fila.id}
                    className="h-11 min-h-[44px] rounded-md bg-red-500 px-4 text-[15px] font-medium text-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Confirmar rechazo
                  </button>
                  <button
                    type="button"
                    onClick={() => setRechazandoId(null)}
                    className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 text-[15px] font-medium text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            {errorPorId[fila.id] ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-red-500">
                <span aria-hidden="true">⚠️</span>
                {errorPorId[fila.id]}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {total > POR_PAGINA ? (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <button
            type="button"
            onClick={() => cargarPagina(pagina - 1)}
            disabled={pagina <= 1 || cargando}
            className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="font-mono">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => cargarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas || cargando}
            className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </main>
  );
}
