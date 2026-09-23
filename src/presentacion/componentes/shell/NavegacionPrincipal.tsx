'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Menu } from 'lucide-react';
import {
  ENLACES_PRINCIPALES_POR_ROL,
  ENLACES_PUBLICOS,
  type EnlacePrincipal,
} from '@presentacion/config/enlacesPorRol';
import type { PerfilPropioShell } from '@presentacion/componentes/shell/BarraSuperior';

interface NavegacionPrincipalProps {
  perfil: PerfilPropioShell | null;
}

/**
 * Un único componente adaptativo (no dos): barra inferior fija en mobile
 * (`≤md`, alcance con el pulgar, sin menú hamburguesa escondido — el
 * patrón más accesible para el público objetivo, ver "Diseño Inclusivo")
 * que en desktop (`md:`) se convierte en sidebar fijo a la izquierda.
 * Mismo dataset (`ENLACES_PRINCIPALES_POR_ROL`/`ENLACES_PUBLICOS`), solo
 * cambia el layout — evita mantener dos componentes/mapeos divergentes.
 *
 * Muestra el subconjunto curado (máx. 4) por rol, más un último ítem fijo
 * "Menú" que lleva a `/panel` (la lista completa de `ENLACES_POR_ROL`) —
 * ahí vive el resto de los accesos que no entran acá.
 */
export function NavegacionPrincipal({ perfil }: NavegacionPrincipalProps) {
  const pathname = usePathname();
  const items = perfil ? (ENLACES_PRINCIPALES_POR_ROL[perfil.rol] ?? []) : ENLACES_PUBLICOS;
  const todos: EnlacePrincipal[] = perfil
    ? [...items, { href: '/panel', etiqueta: 'Menú', icono: Menu }]
    : items;

  if (todos.length === 0) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className={clsx(
        'fixed inset-x-0 bottom-0 z-20 flex shrink-0 border-t border-surface2 bg-base',
        'md:sticky md:top-14 md:bottom-auto md:h-[calc(100vh-3.5rem)] md:w-56 md:flex-col md:border-r md:border-t-0 md:py-2',
      )}
    >
      {todos.map((item) => {
        const activo = pathname === item.href;
        const Icono = item.icono;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? 'page' : undefined}
            className={clsx(
              'flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs',
              'md:flex-none md:flex-row md:justify-start md:gap-2 md:px-4 md:py-3 md:text-[15px]',
              activo ? 'font-medium text-primary' : 'text-text-muted hover:text-text-primary',
            )}
          >
            <Icono aria-hidden="true" className="h-6 w-6 shrink-0 md:h-5 md:w-5" />
            <span className="truncate">{item.etiqueta}</span>
          </Link>
        );
      })}
    </nav>
  );
}
