'use client';

import { useEffect, useState } from 'react';
import { PanelReportesMunicipio } from '@presentacion/componentes/municipio/PanelReportesMunicipio';

interface PerfilApi {
  rol: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

/**
 * Panel municipal de reportes activos (Módulo 2). middleware.ts ya exige rol
 * municipio/administrador para llegar a esta página (Paso 1) — acá se
 * resuelve el propio rol vía GET /api/perfil (ya existente, mismo criterio
 * que BadgeVerificacion) para pasárselo a PanelReportesMunicipio.tsx, que
 * hace su propia verificación antes de mostrar el control de cambio de
 * estado (defensa en profundidad, y lo que permite testear ese componente
 * de forma aislada sin depender del middleware).
 */
export default function PaginaDashboardMunicipio() {
  const [rol, setRol] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarPerfil() {
      try {
        const respuesta = await fetch('/api/perfil');
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json()) as RespuestaError;
          if (!cancelado) setError(cuerpo.mensaje);
          return;
        }
        const perfil = (await respuesta.json()) as PerfilApi;
        if (!cancelado) setRol(perfil.rol);
      } catch {
        if (!cancelado) setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarPerfil();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Panel municipal de reportes</h1>
      <p className="mb-6 text-sm text-slate-400">
        Reportes activos de la comunidad, con filtros combinados y cambio de estado.
      </p>

      {cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}

      {error ? (
        <p className="flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {!cargando && !error && rol ? <PanelReportesMunicipio rol={rol} /> : null}
    </main>
  );
}
