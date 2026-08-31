'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { TIPOS_REPORTE_SOPORTADOS, type TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';
import { FormularioReporteWizard } from '@presentacion/componentes/reportes/FormularioReporteWizard';

function esTipoSoportado(valor: string | null): valor is TipoReporte {
  return TIPOS_REPORTE_SOPORTADOS.includes(valor as TipoReporte);
}

const ETIQUETAS_CATEGORIA: Record<TipoReporte, string> = {
  perdido: 'Perdí a mi mascota',
  encontrado: 'Encontré una mascota',
  problematica: 'Reportar problemática',
};

/**
 * Categoría inicial vía `?tipo=` (docs/SITEMAP.md: "/reportes/nuevo (perdido
 * | encontrado | problemática)" — una sola ruta, la categoría la decide el
 * query param). Default 'perdido' si el param falta o trae un valor no
 * soportado, para no romper enlaces existentes hacia /reportes/nuevo.
 * Selección visual de categoría (nunca texto libre): tres botones tipo
 * segmented control, cada uno un link a la misma ruta con `?tipo=` distinto.
 */
function ContenidoPaginaNuevoReporte() {
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get('tipo');
  const tipo: TipoReporte = esTipoSoportado(tipoParam) ? tipoParam : 'perdido';

  return (
    <>
      <nav
        aria-label="Categoría del reporte"
        className="mx-auto flex max-w-md gap-2 px-6 pt-10"
      >
        {TIPOS_REPORTE_SOPORTADOS.map((valor) => (
          <Link
            key={valor}
            href={`/reportes/nuevo?tipo=${valor}`}
            aria-current={valor === tipo ? 'page' : undefined}
            className={clsx(
              'flex-1 rounded-md border px-2 py-2 text-center text-xs font-medium',
              valor === tipo
                ? 'border-blue-500 bg-blue-500 text-slate-50'
                : 'border-slate-700 bg-slate-800 text-slate-300',
            )}
          >
            {ETIQUETAS_CATEGORIA[valor]}
          </Link>
        ))}
      </nav>
      <FormularioReporteWizard key={tipo} tipoInicial={tipo} />
    </>
  );
}

export default function PaginaNuevoReporte() {
  return (
    <Suspense fallback={null}>
      <ContenidoPaginaNuevoReporte />
    </Suspense>
  );
}
