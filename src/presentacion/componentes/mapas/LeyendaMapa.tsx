import type { LucideIcon } from 'lucide-react';

export interface ItemLeyendaMapa {
  etiqueta: string;
  color: string;
  icono: LucideIcon;
  esFoto?: boolean;
}

interface LeyendaMapaProps {
  items: ItemLeyendaMapa[];
  /** Aclaración opcional debajo de las referencias de color (ej. qué más distingue el ícono). */
  notaAdicional?: string;
}

/**
 * Leyenda de colores/íconos de marcadores — compartida entre `MapaReportes.tsx`
 * (`/reportes`) y `MapaComunidad.tsx` (home), que muestran el mismo tipo de
 * marcador con el mismo criterio de color (ver `iconosReporteFlyweight.ts`).
 * Nunca solo color: cada referencia trae ícono + texto.
 */
export function LeyendaMapa({ items, notaAdicional }: LeyendaMapaProps) {
  return (
    <div aria-label="Referencias del mapa" className="mt-3 text-sm text-text-muted">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {items.map((item) => (
          <span key={item.etiqueta} className="flex items-center gap-2">
            {item.esFoto ? (
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-surface1 text-text-primary shadow-sm"
                style={{ borderColor: item.color }}
              >
                <item.icono aria-hidden="true" className="h-3.5 w-3.5" style={{ color: item.color }} />
              </span>
            ) : (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: item.color }}
              >
                <item.icono aria-hidden="true" className="h-3 w-3 text-base" />
              </span>
            )}
            <span>{item.etiqueta}</span>
          </span>
        ))}
      </div>
      {notaAdicional ? <p className="mt-1.5 text-xs text-text-muted">{notaAdicional}</p> : null}
    </div>
  );
}
