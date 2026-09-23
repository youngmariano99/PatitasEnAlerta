'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { crearClienteSupabaseNavegador } from '@infraestructura/adaptadores/ClienteSupabaseNavegador';
import { CampanaNotificaciones } from '@presentacion/componentes/notificaciones/CampanaNotificaciones';
import { Boton } from '@presentacion/componentes/ui/Boton';

export interface PerfilPropioShell {
  id: string;
  email: string;
  rol: string;
}

interface BarraSuperiorProps {
  perfil: PerfilPropioShell | null;
}

/** Destinos "raíz" donde no tiene sentido ofrecer "Volver" (no hay a dónde volver dentro de la app). */
const DESTINOS_SIN_VOLVER = ['/', '/panel'];

/**
 * Overrides de destino para pantallas donde el historial del navegador
 * (`router.back()`) no es un "volver" confiable — ej. se puede llegar a
 * `/mascotas/[id]/libreta` por un link compartido o al refrescar, sin que
 * haya una entrada de mascota en el historial. En esos casos "Volver"
 * navega siempre al destino fijo, nunca a lo que sea que haya en el
 * historial.
 */
const OVERRIDES_VOLVER: Array<{
  patron: RegExp;
  destino: (coincidencia: RegExpMatchArray) => string;
}> = [{ patron: /^\/mascotas\/([^/]+)\/libreta$/, destino: (m) => `/mascotas/${m[1]}` }];

function destinoVolverPersonalizado(pathname: string): string | null {
  for (const { patron, destino } of OVERRIDES_VOLVER) {
    const coincidencia = pathname.match(patron);
    if (coincidencia) return destino(coincidencia);
  }
  return null;
}

/**
 * Cabecera persistente: volver + marca a la izquierda, sesión (campana de
 * notificaciones + email + cerrar sesión) o "Iniciar sesión" a la derecha.
 * `perfil` llega ya resuelto desde `ShellNavegacion` (fetch a `/api/perfil`
 * SIN pasar por `fetchConSesion` — acá un 401 es "modo invitado", no una
 * sesión que haya que redirigir).
 */
export function BarraSuperior({ perfil }: BarraSuperiorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const muestraVolver = pathname ? !DESTINOS_SIN_VOLVER.includes(pathname) : false;
  const destinoFijo = pathname ? destinoVolverPersonalizado(pathname) : null;

  async function cerrarSesion() {
    const supabase = crearClienteSupabaseNavegador();
    await supabase.auth.signOut();
    // Hard reload (no router.push): limpia cualquier estado en memoria que
    // dependa de las cookies que gestiona Supabase — mismo criterio que el
    // redirect por 401 de fetchConSesion.ts.
    window.location.assign('/');
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-surface2 bg-base px-3">
      <div className="flex min-w-0 items-center gap-1">
        {muestraVolver ? (
          <button
            type="button"
            onClick={() => (destinoFijo ? router.push(destinoFijo) : router.back())}
            aria-label="Volver"
            className="flex h-11 w-11 min-h-touch min-w-touch shrink-0 items-center justify-center rounded-md text-lg text-text-primary hover:bg-surface1"
          >
            <span aria-hidden="true">←</span>
          </button>
        ) : null}
        <Link
          href={perfil ? '/panel' : '/'}
          className="truncate font-display text-base font-semibold text-text-primary"
        >
          🐾 Patitas en Alerta
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {perfil ? (
          <>
            <CampanaNotificaciones usuarioId={perfil.id} />
            <span className="hidden max-w-[10rem] truncate text-sm text-text-muted sm:inline">
              {perfil.email}
            </span>
            <Boton variante="texto" onClick={cerrarSesion}>
              Cerrar sesión
            </Boton>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="flex h-11 min-h-touch items-center rounded-md px-3 text-[15px] font-medium text-accent"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
}
