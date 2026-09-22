import clsx from 'clsx';

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
const CONFIG_POR_TONO: Record<TonoBadge, { estilos: string; icono: string }> = {
  neutro: { estilos: 'bg-surface2 text-text-primary', icono: 'ℹ️' },
  exito: { estilos: 'bg-success/10 text-success', icono: '✅' },
  alerta: { estilos: 'bg-alert/10 text-alert', icono: '⚠️' },
  peligro: { estilos: 'bg-danger/10 text-danger', icono: '⛔' },
};

export function Badge({ tono = 'neutro', children, className }: BadgeProps) {
  const { estilos, icono } = CONFIG_POR_TONO[tono];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium',
        estilos,
        className,
      )}
    >
      <span aria-hidden="true">{icono}</span>
      {children}
    </span>
  );
}
