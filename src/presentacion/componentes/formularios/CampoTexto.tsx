import { type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  error?: string;
  ayuda?: string;
}

/**
 * Campo de formulario del Design System obligatorio (Dark Utility Premium).
 * El error nunca se comunica solo por color (NFR Accesibilidad): siempre
 * acompaña ícono + texto. Reutilizable en cualquier formulario del proyecto.
 */
export function CampoTexto({ id, label, error, ayuda, className, ...inputProps }: CampoTextoProps) {
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-50">
        {label}
      </label>
      <input
        id={id}
        className={clsx(
          'h-11 min-h-[44px] rounded-md border bg-slate-800 px-3 text-[15px] text-slate-50',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
          error ? 'border-red-500' : 'border-slate-700',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? idError : ayuda ? idAyuda : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={idError} className="flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : ayuda ? (
        <p id={idAyuda} className="text-sm text-slate-400">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}
