import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { BuscarReportesSimilares } from '@aplicacion/casos-de-uso/red-colaboracion/BuscarReportesSimilares';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Búsqueda híbrida de reportes por similitud semántica de descripción
 * (Módulo 5/9, Post-MVP) — pgvector sobre `descripcion_embedding` combinado
 * con filtros exactos. Igual que GET /api/red-colaboracion/directorio, exige
 * sesión (prefijo protegido en middleware.ts, sin excepción de lectura
 * pública); la autorización por rol vive en
 * BuscarReportesSimilares.autorizar() (PEA-SIS-002), nunca acá.
 */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(BuscarReportesSimilares);
    const resultado = await casoDeUso.ejecutar({
      datosCrudos: Object.fromEntries(request.nextUrl.searchParams),
      usuarioSolicitanteId: usuarioAutenticado.id,
    });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/red-colaboracion/reportes/similares');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
