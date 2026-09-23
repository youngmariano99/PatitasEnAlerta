import Image from 'next/image';

interface EncabezadoIlustradoProps {
  imagenSrc: string;
  alt: string;
  titulo: string;
  descripcion?: string;
}

/**
 * Versión compacta de `EstadoIlustrado` para usar como encabezado dentro de
 * pantallas operativas (wizards, dashboards, libreta sanitaria) — la mascota
 * acompaña sin competir con los datos reales de la pantalla (docs/DISENO.md).
 */
export function EncabezadoIlustrado({
  imagenSrc,
  alt,
  titulo,
  descripcion,
}: EncabezadoIlustradoProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Mismo criterio que EstadoIlustrado.tsx: ancho fijo + `h-auto`, nunca
          una caja cuadrada forzada — las ilustraciones de public/animales/
          no son todas cuadradas (algunas son escenas rectangulares, otras
          recortes de un solo personaje) y forzarlas a 56×56 las aplastaba. */}
      <Image
        src={imagenSrc}
        alt={alt}
        width={220}
        height={220}
        className="h-auto w-20 shrink-0 sm:w-24"
        priority={false}
      />
      <div className="flex flex-col gap-0.5">
        <h1 className="font-display text-xl font-semibold text-text-primary">{titulo}</h1>
        {descripcion ? <p className="text-sm text-text-muted">{descripcion}</p> : null}
      </div>
    </div>
  );
}
