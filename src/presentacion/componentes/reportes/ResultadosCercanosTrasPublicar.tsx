'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { TONO_POR_TIPO_REPORTE } from '@presentacion/config/tonosReporte';
import type { TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';

export interface ResultadoCercano {
  id: string;
  tipo: string;
  descripcion: string;
  especie: string | null;
}

type TipoReporteOpuesto = 'perdido' | 'encontrado';

interface ResultadosCercanosTrasPublicarProps {
  tipoOpuesto: TipoReporteOpuesto;
  resultados: ResultadoCercano[];
  cargando: boolean;
  onIrAlListado: () => void;
}

const ETIQUETA_TIPO_OPUESTO: Record<TipoReporteOpuesto, string> = {
  perdido: 'mascotas perdidas',
  encontrado: 'mascotas encontradas',
};

/**
 * Pantalla terminal del wizard de reporte — se muestra recién DESPUÉS de
 * publicar (nunca durante, para no distraer a quien está reportando por
 * primera vez), con reportes del tipo opuesto cerca de la misma zona.
 * Reutiliza GET /api/reportes (público, ya filtra por zona) — sin backend
 * nuevo, ver FormularioReporteWizard.tsx.
 */
export function ResultadosCercanosTrasPublicar({
  tipoOpuesto,
  resultados,
  cargando,
  onIrAlListado,
}: ResultadosCercanosTrasPublicarProps) {
  return (
    <main className="mx-auto max-w-md px-6 py-10 text-text-primary">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-success">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        ¡Reporte publicado!
      </p>
      <h1 className="mb-1 text-xl font-semibold">Mientras tanto, esto encontramos cerca</h1>
      <p className="mb-6 text-sm text-text-muted">
        Revisá si hay {ETIQUETA_TIPO_OPUESTO[tipoOpuesto]} cerca de la zona que marcaste — por ahí
        alguien ya reportó lo que estás buscando.
      </p>

      {cargando ? <p className="mb-6 text-sm text-text-muted">Buscando…</p> : null}

      {!cargando && resultados.length === 0 ? (
        <p className="mb-6 text-sm text-text-muted">
          No encontramos {ETIQUETA_TIPO_OPUESTO[tipoOpuesto]} cerca todavía.
        </p>
      ) : null}

      {!cargando && resultados.length > 0 ? (
        <ul className="mb-6 flex flex-col gap-2">
          {resultados.map((resultado) => (
            <li key={resultado.id}>
              <Link href={`/reportes/${resultado.id}`}>
                <Tarjeta className="hover:border-accent">
                  <Badge tono={TONO_POR_TIPO_REPORTE[resultado.tipo as TipoReporte] ?? 'neutro'}>
                    {resultado.tipo}
                  </Badge>
                  <p className="mt-1 text-sm text-text-primary">{resultado.descripcion}</p>
                </Tarjeta>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <Boton onClick={onIrAlListado} className="w-full">
        Ir al listado de reportes
      </Boton>
    </main>
  );
}
