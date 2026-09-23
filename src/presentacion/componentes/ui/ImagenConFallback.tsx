'use client';

import { useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { PawPrint } from 'lucide-react';

interface ImagenConFallbackProps {
  src: string;
  alt: string;
  /** Aplicada al contenedor (que debe traer `position: relative` + tamaño, ver `next/image fill`) y al fallback. */
  className?: string;
  sizes?: string;
}

/**
 * Envoltorio de `next/image` con fallback ante una URL rota (foto borrada del
 * storage, red caída, etc.) — hoy ningún `<img>`/`<Image>` de la app maneja
 * ese caso, y el usuario reportó que el ícono de imagen rota del navegador
 * se ve mal. En vez de eso, muestra un bloque con un ícono de pata sobre
 * `surface2`. Usa `fill`, así que el contenedor que la use necesita
 * `position: relative` y un tamaño definido (mismo criterio que el resto de
 * los usos de `next/image` con `fill` en la app).
 */
export function ImagenConFallback({ src, alt, className, sizes }: ImagenConFallbackProps) {
  const [rota, setRota] = useState(false);

  if (rota) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={clsx('flex items-center justify-center bg-surface2', className)}
      >
        <PawPrint aria-hidden="true" className="h-10 w-10 text-text-muted" />
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        onError={() => setRota(true)}
      />
    </div>
  );
}
