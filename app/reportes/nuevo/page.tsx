'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TIPOS_REPORTE_SOPORTADOS, type TipoReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';
import { FormularioReporteWizard } from '@presentacion/componentes/reportes/FormularioReporteWizard';

function esTipoSoportado(valor: string | null): valor is TipoReporte {
  return TIPOS_REPORTE_SOPORTADOS.includes(valor as TipoReporte);
}

/**
 * Categoría inicial vía `?tipo=` (docs/SITEMAP.md: "/reportes/nuevo (perdido
 * | encontrado | problemática)" — una sola ruta, la categoría la decide el
 * query param). Default 'perdido' si el param falta o trae un valor no
 * soportado, para no romper enlaces existentes hacia /reportes/nuevo.
 */
function ContenidoPaginaNuevoReporte() {
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get('tipo');
  const tipo: TipoReporte = esTipoSoportado(tipoParam) ? tipoParam : 'perdido';
  const tipoOpuesto: TipoReporte = tipo === 'perdido' ? 'encontrado' : 'perdido';

  return (
    <>
      <FormularioReporteWizard tipoInicial={tipo} />
      <p className="mx-auto -mt-8 mb-12 max-w-md px-6 text-center text-sm text-slate-400">
        {tipo === 'perdido' ? '¿Encontraste una mascota en vez de perderla? ' : '¿Se te perdió una mascota en vez de encontrarla? '}
        <Link href={`/reportes/nuevo?tipo=${tipoOpuesto}`} className="font-medium text-blue-400 underline underline-offset-2">
          Cambiá la categoría
        </Link>
      </p>
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
