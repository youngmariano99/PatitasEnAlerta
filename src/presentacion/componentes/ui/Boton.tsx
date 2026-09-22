import { type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type VarianteBoton = 'primaria' | 'secundaria' | 'alerta' | 'texto';

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
}

/**
 * `alerta` (Naranja Alerta) está reservada por el Brandbook para emergencias
 * reales y acciones críticas (ver docs/DISENO.md) — no usar para acciones
 * comunes de formulario, aunque el componente no lo impida a nivel de tipos.
 */
const ESTILOS_POR_VARIANTE: Record<VarianteBoton, string> = {
  primaria: 'bg-primary text-base hover:brightness-95',
  secundaria: 'border border-accent text-accent hover:bg-accent/10',
  alerta: 'bg-alert text-base hover:brightness-95',
  texto: 'text-accent hover:bg-accent/10',
};

export function Boton({ variante = 'primaria', className, children, ...props }: BotonProps) {
  return (
    <button
      className={clsx(
        'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-md px-4 text-[15px] font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        ESTILOS_POR_VARIANTE[variante],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
