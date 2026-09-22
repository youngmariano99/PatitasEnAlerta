import Image from 'next/image';
import { type ReactNode } from 'react';

interface EstadoIlustradoProps {
  imagenSrc: string;
  alt: string;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}

/**
 * Estado vacío / de error / de éxito ilustrado con una de las mascotas de
 * `public/animales/` (docs/DISENO.md). Reservado a onboarding, estados
 * vacíos, confirmaciones y errores — nunca a pantallas operativas con datos
 * médicos/de emergencia reales (ahí usar `EncabezadoIlustrado`, más chico).
 */
export function EstadoIlustrado({
  imagenSrc,
  alt,
  titulo,
  descripcion,
  accion,
}: EstadoIlustradoProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-text-muted/40 bg-surface1 p-8 text-center">
      <Image
        src={imagenSrc}
        alt={alt}
        width={220}
        height={220}
        className="h-auto w-40 sm:w-56"
        priority={false}
      />
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-lg font-semibold text-text-primary">{titulo}</h2>
        {descripcion ? <p className="text-sm text-text-muted">{descripcion}</p> : null}
      </div>
      {accion ? <div className="mt-2">{accion}</div> : null}
    </div>
  );
}
