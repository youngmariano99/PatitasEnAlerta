import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ExportarDashboardMunicipal } from '@aplicacion/casos-de-uso/municipio/ExportarDashboardMunicipal';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Exportación a CSV del resumen de actividad municipal (Historia
 * "Exportación de resumen de actividad", MUN-05). Exclusivo de rol
 * municipio/administrador — verificado en
 * ExportarDashboardMunicipal.autorizar() (PEA-MUN-005), nunca acá.
 *
 * Paso 3 del ticket: la respuesta va con `Content-Disposition: attachment`
 * (el navegador la descarga en vez de intentar mostrarla) y el nombre de
 * archivo, con la fecha de generación, sale de
 * `ExportarDashboardMunicipal.persistir()` — este handler nunca decide el
 * nombre por su cuenta.
 */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(ExportarDashboardMunicipal);
    const resultado = await casoDeUso.ejecutar({
      datosCrudos: Object.fromEntries(request.nextUrl.searchParams),
      municipioId: usuarioAutenticado.id,
    });

    return new NextResponse(resultado.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${resultado.nombreArchivo}"`,
      },
    });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/municipio/dashboard/exportar');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
