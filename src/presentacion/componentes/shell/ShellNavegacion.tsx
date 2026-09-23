'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarraSuperior,
  type PerfilPropioShell,
} from '@presentacion/componentes/shell/BarraSuperior';
import { NavegacionPrincipal } from '@presentacion/componentes/shell/NavegacionPrincipal';
import { PieDePagina } from '@presentacion/componentes/shell/PieDePagina';

/** Prefijo de rutas donde el shell completo (barra + navegación + footer) no aplica — login/registro/recuperar-password. */
const PREFIJO_OCULTO = '/auth';

/**
 * Único punto de montaje del shell de navegación — vive en `app/layout.tsx`
 * y envuelve a `{children}` de cada página, sin que cada página tenga que
 * saber nada de esto.
 *
 * Resuelve la sesión con `fetch('/api/perfil')` **directo, nunca
 * `fetchConSesion`**: `fetchConSesion` fuerza un hard-redirect a
 * `/auth/login` ante un 401 (`src/presentacion/lib/fetchConSesion.ts`), lo
 * que acá rompería el acceso público de un visitante anónimo en
 * `/reportes`, `/adopciones`, `/comercios`, etc. — un 401 en este fetch
 * puntual significa "modo invitado", no una sesión vencida a redirigir.
 *
 * Se re-consulta en cada cambio de ruta (`pathname` como dependencia) para
 * reflejar login/logout sin depender de que esas acciones recarguen toda
 * la página — hoy el logout sí hace un hard reload, pero el login navega
 * con `router.push`, así que esto es lo que hace que la barra pase de
 * "invitado" a "con sesión" sin refrescar manualmente.
 */
export function ShellNavegacion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const oculto = pathname?.startsWith(PREFIJO_OCULTO) ?? false;
  const [perfil, setPerfil] = useState<PerfilPropioShell | null>(null);

  const cargarPerfil = useCallback(async () => {
    try {
      const respuesta = await fetch('/api/perfil');
      if (!respuesta.ok) {
        setPerfil(null);
        return;
      }
      const datos = (await respuesta.json()) as PerfilPropioShell;
      setPerfil(datos);
    } catch {
      setPerfil(null);
    }
  }, []);

  useEffect(() => {
    // En /auth/* el shell no se renderiza (ver el `if (oculto)` más abajo) —
    // pedir el perfil ahí sería una llamada de red desperdiciada.
    if (oculto) return;
    cargarPerfil();
  }, [cargarPerfil, oculto, pathname]);

  if (oculto) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BarraSuperior perfil={perfil} />
      <div className="flex flex-1 md:flex-row">
        <NavegacionPrincipal perfil={perfil} />
        <div className="min-w-0 flex-1 pb-16 md:pb-0">{children}</div>
      </div>
      <PieDePagina />
    </div>
  );
}
