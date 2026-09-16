import { type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  error?: string;
  ayuda?: string;
}

/**
 * Campo de formulario del Design System obligatorio (Brandbook, docs/DISENO.md).
 * El error nunca se comunica solo por color (NFR Accesibilidad): siempre
 * acompaña ícono + texto. Reutilizable en cualquier formulario del proyecto.
 */
export function CampoTexto({ id, label, error, ayuda, className, ...inputProps }: CampoTextoProps) {
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={id}
        className={clsx(
          'h-11 min-h-[44px] rounded-md border bg-surface1 px-3 text-[15px] text-text-primary',
          'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent',
          error ? 'border-danger' : 'border-surface2',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? idError : ayuda ? idAyuda : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={idError} className="flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : ayuda ? (
        <p id={idAyuda} className="text-sm text-text-muted">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}
