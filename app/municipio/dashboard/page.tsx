'use client';

import { useEffect, useState } from 'react';
import { PanelReportesMunicipio } from '@presentacion/componentes/municipio/PanelReportesMunicipio';
import { DashboardAnaliticoMunicipal } from '@presentacion/componentes/municipio/DashboardAnaliticoMunicipal';

interface PerfilApi {
  rol: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

/**
 * Panel municipal (Módulos 2 y 3). middleware.ts ya exige rol
 * municipio/administrador para llegar a esta página (Paso 1) — acá se
 * resuelve el propio rol vía GET /api/perfil (ya existente, mismo criterio
 * que BadgeVerificacion) para pasárselo a PanelReportesMunicipio.tsx, que
 * hace su propia verificación antes de mostrar el control de cambio de
 * estado (defensa en profundidad, y lo que permite testear ese componente
 * de forma aislada sin depender del middleware).
 *
 * DashboardAnaliticoMunicipal.tsx (Historia "Dashboard analítico con mapas
 * de calor") no repite la verificación de rol: middleware.ts ya protege
 * toda `/municipio/*` con municipio/administrador (a diferencia de
 * PanelReportesMunicipio, reutilizado en otras páginas con roles mixtos,
 * este componente vive únicamente acá) — si igual llegara una sesión sin
 * ese rol, GET /api/municipio/dashboard responde 403/PEA-MUN-005 y el
 * componente lo muestra como cualquier otro error de carga.
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

      <DashboardAnaliticoMunicipal />
    </main>
  );
}
