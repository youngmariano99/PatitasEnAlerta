import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ObtenerReportePorId, ReporteNoEncontradoError } from '@aplicacion/casos-de-uso/reportes/ObtenerReportePorId';
import { logger } from '@infraestructura/logging/logger';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

interface ContextoRuta {
  params: { id: string };
}

/**
 * Obtiene el detalle público de un reporte.
 */
export async function GET(request: NextRequest, { params }: ContextoRuta) {
  try {
    const casoDeUso = container.resolve(ObtenerReportePorId);
    const reporte = await casoDeUso.ejecutar(params.id);
    return NextResponse.json(reporte, { status: 200 });
  } catch (error) {
    if (error instanceof ReporteNoEncontradoError) {
      return respuestaDeError(error.codigo, error.message, 404);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/reportes/[id]');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
