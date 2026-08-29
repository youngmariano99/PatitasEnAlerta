'use client';

import { useCallback, useEffect, useState } from 'react';

interface FilaHistorialApi {
  id: string;
  usuarioId: string;
  tipo: 'veterinario' | 'municipio';
  email: string;
  estado: 'aprobado' | 'rechazado';
  motivoRechazo: string | null;
  revisadoPor: string | null;
  resueltoEn: string | null;
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

function formatearFecha(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function detalleSolicitante(fila: FilaHistorialApi): string {
  if (fila.tipo === 'veterinario') {
    return `Matrícula ${fila.matricula ?? '—'} · ${fila.colegioEmisor ?? '—'}`;
  }
  return fila.nombreInstitucional ?? '—';
}

/**
 * Historial de auditoría (AUTH-09) — vista exclusivamente de lectura sobre
 * verificaciones ya resueltas. No expone ningún botón/formulario de edición:
 * a diferencia de app/admin/verificaciones/page.tsx (la cola pendiente), acá
 * no hay `resolver()` ni acciones — es un registro histórico inmutable.
 */
export default function PaginaHistorialAuditoria() {
  const [filas, setFilas] = useState<FilaHistorialApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarPagina = useCallback(async (paginaSolicitada: number) => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const respuesta = await fetch(`/api/admin/auditoria?pagina=${paginaSolicitada}&porPagina=${POR_PAGINA}`);
      if (respuesta.status === 401 || respuesta.status === 403) {
        setErrorCarga('No tenés permiso para ver este panel.');
        return;
      }
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorCarga(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as { items: FilaHistorialApi[]; total: number; pagina: number };
      setFilas(datos.items);
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
    <main className="mx-auto max-w-5xl px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Historial de auditoría</h1>
      <p className="mb-6 text-sm text-slate-400">
        Registro de solo lectura de las verificaciones ya resueltas. Ninguna acción de esta vista modifica el
        historial.
      </p>

      {cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}

      {!cargando && filas.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
          Todavía no hay verificaciones resueltas.
        </div>
      ) : null}

      {!cargando && filas.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-700">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
                <th scope="col" className="px-4 py-3 font-medium">
                  Solicitante
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Motivo de rechazo
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Revisado por
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Resuelto el
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Solicitado el
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id} className="border-b border-slate-800 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-50">{fila.email}</p>
                    <p className="text-xs text-slate-400">{detalleSolicitante(fila)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{fila.tipo}</td>
                  <td className="px-4 py-3">
                    {fila.estado === 'aprobado' ? (
                      <span className="flex items-center gap-1.5 text-emerald-500">
                        <span aria-hidden="true">✓</span>
                        Aprobado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-500">
                        <span aria-hidden="true">✕</span>
                        Rechazado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{fila.motivoRechazo ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{fila.revisadoPor ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{formatearFecha(fila.resueltoEn)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{formatearFecha(fila.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

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
