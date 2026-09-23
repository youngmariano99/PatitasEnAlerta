import type { LucideIcon } from 'lucide-react';

export interface ItemLeyendaMapa {
  etiqueta: string;
  color: string;
  icono: LucideIcon;
}

interface LeyendaMapaProps {
  items: ItemLeyendaMapa[];
}

/**
 * Leyenda de colores/íconos de marcadores — compartida entre `MapaReportes.tsx`
 * (`/reportes`) y `MapaComunidad.tsx` (home), que muestran el mismo tipo de
 * marcador con el mismo criterio de color (ver `iconosReporteFlyweight.ts`).
 * Nunca solo color: cada referencia trae ícono + texto.
 */
export function LeyendaMapa({ items }: LeyendaMapaProps) {
  return (
    <div
      aria-label="Referencias del mapa"
      className="mt-3 flex flex-wrap gap-4 text-sm text-text-muted"
    >
      {items.map((item) => (
        <span key={item.etiqueta} className="flex items-center gap-1.5">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: item.color }}
          >
            <item.icono aria-hidden="true" className="h-3 w-3 text-base" />
          </span>
          {item.etiqueta}
        </span>
      ))}
    </div>
  );
}
