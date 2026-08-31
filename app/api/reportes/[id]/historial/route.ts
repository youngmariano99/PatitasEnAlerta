import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ListarHistorialReporte } from '@aplicacion/casos-de-uso/reportes/ListarHistorialReporte';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

interface ContextoRuta {
  params: { id: string };
}

/**
 * Historial de cambios de estado de un reporte (Módulo 2). Exclusivo del
 * dueño del reporte, o de rol municipio/administrador — verificado en
 * ListarHistorialReporte.autorizar() (PEA-SIS-002), nunca acá. A diferencia
 * de GET /api/reportes (listado público), esta subruta SÍ exige sesión
 * (middleware.ts: la excepción de lectura pública sobre /api/reportes es de
 * coincidencia exacta, no por prefijo).
 */
export async function GET(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(ListarHistorialReporte);
    const resultado = await casoDeUso.ejecutar({ reporteId: params.id, solicitanteId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return respuestaDeError('PEA-SIS-005', 'Revisá los datos ingresados, algo no tiene el formato esperado.', 400);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/reportes/[id]/historial');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
