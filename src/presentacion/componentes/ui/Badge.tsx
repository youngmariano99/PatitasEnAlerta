import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';

type TonoBadge = 'neutro' | 'exito' | 'alerta' | 'peligro';

interface BadgeProps {
  tono?: TonoBadge;
  children: React.ReactNode;
  className?: string;
}

/**
 * Regla no negociable del Brandbook (docs/DISENO.md): ningún estado se
 * comunica solo por color. Cada tono trae su propio ícono, nunca solo un
 * cambio de fondo/texto.
 */
const CONFIG_POR_TONO: Record<TonoBadge, { estilos: string; icono: LucideIcon }> = {
  neutro: { estilos: 'bg-surface2 text-text-primary', icono: Info },
  exito: { estilos: 'bg-success/10 text-success', icono: CheckCircle2 },
  alerta: { estilos: 'bg-alert/10 text-alert', icono: AlertTriangle },
  peligro: { estilos: 'bg-danger/10 text-danger', icono: XCircle },
};

export function Badge({ tono = 'neutro', children, className }: BadgeProps) {
  const { estilos, icono: Icono } = CONFIG_POR_TONO[tono];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium',
        estilos,
        className,
      )}
    >
      <Icono aria-hidden="true" className="h-4 w-4 shrink-0" />
      {children}
    </span>
  );
}
