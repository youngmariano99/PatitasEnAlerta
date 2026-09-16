import { type HTMLAttributes } from 'react';
import clsx from 'clsx';

type TarjetaProps = HTMLAttributes<HTMLDivElement>;

export function Tarjeta({ className, children, ...props }: TarjetaProps) {
  return (
    <div
      className={clsx('rounded-lg border border-surface2 bg-surface1 p-4 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}
