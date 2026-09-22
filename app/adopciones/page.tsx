'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const POR_PAGINA = 50;

interface FichaApi {
  id: string;
  nombreAnimal: string;
  especie: string;
  edadAproximada: number | null;
  tamano: string | null;
  temperamento: string | null;
  estadoSalud: string | null;
  requisitosAdopcion: string | null;
  fotoUrl: string;
  estado: string;
  createdAt: string;
}

interface RespuestaListado {
  items: FichaApi[];
  total: number;
  pagina: number;
  porPagina: number;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

/**
 * Vitrina pública de adopción (Módulo 3, Historia "Consulta pública de la
 * vitrina de adopción") — galería de fichas 'disponible', accesible sin
 * sesión (GET /api/adopciones, RLS vitrina_select_publico). A diferencia
 * del panel municipal (app/municipio/adopciones/page.tsx), es de solo
 * lectura: ni publica, ni edita, ni da de baja fichas.
 */
export default function PaginaAdopciones() {
  const [items, setItems] = useState<FichaApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarPagina = useCallback(async (paginaSolicitada: number) => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const respuesta = await fetch(
        `/api/adopciones?pagina=${paginaSolicitada}&porPagina=${POR_PAGINA}`,
      );
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorCarga(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as RespuestaListado;
      setItems(datos.items);
      setTotal(datos.total);
      setPagina(datos.pagina);
    } catch {
      setErrorCarga(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPagina(1);
  }, [cargarPagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-text-primary">
      <h1 className="mb-1 text-xl font-semibold">Vitrina de adopción</h1>
      <p className="mb-2 text-sm text-text-muted">
        Animales rescatados por el municipio, listos para encontrar un nuevo hogar.
      </p>
      <Link
        href="/adopciones/compatibilidad"
        className="mb-6 inline-block text-sm text-accent underline underline-offset-2"
      >
        ¿No sabés cuál elegir? Completá el cuestionario de compatibilidad
      </Link>

      {errorCarga ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {errorCarga}
        </p>
      ) : null}

      {cargando ? <p className="text-sm text-text-muted">Cargando…</p> : null}

      {!cargando && !errorCarga && items.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface2 p-8 text-center">
          <p className="mb-1 text-sm font-medium text-text-primary">
            Por ahora no hay animales disponibles para adopción.
          </p>
          <p className="text-sm text-text-muted">
            Volvé a consultar más adelante — el municipio publica nuevas fichas a medida que rescata
            animales.
          </p>
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((ficha) => (
            <article
              key={ficha.id}
              className="overflow-hidden rounded-md border border-surface2 bg-surface1/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ficha.fotoUrl}
                alt={ficha.nombreAnimal}
                className="h-48 w-full object-cover"
              />
              <div className="flex flex-col gap-1.5 p-4">
                <p className="font-medium text-text-primary">
                  {ficha.nombreAnimal} <span className="text-text-muted">· {ficha.especie}</span>
                </p>
                <p className="text-sm text-text-muted">
                  {[
                    ficha.edadAproximada !== null ? `${ficha.edadAproximada} años` : null,
                    ficha.tamano ? ficha.tamano[0]!.toUpperCase() + ficha.tamano.slice(1) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Sin datos adicionales'}
                </p>
                {ficha.temperamento ? (
                  <p className="text-sm text-text-muted">{ficha.temperamento}</p>
                ) : null}
                {ficha.requisitosAdopcion ? (
                  <p className="mt-1 text-xs text-text-primary0">{ficha.requisitosAdopcion}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {total > POR_PAGINA ? (
        <div className="mt-6 flex items-center justify-between text-sm text-text-muted">
          <button
            type="button"
            onClick={() => cargarPagina(pagina - 1)}
            disabled={pagina <= 1 || cargando}
            className="h-11 min-h-[44px] rounded-md border border-surface2 px-4 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="h-11 min-h-[44px] rounded-md border border-surface2 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </main>
  );
}
