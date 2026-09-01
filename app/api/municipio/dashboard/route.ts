import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ObtenerDashboardMunicipal } from '@aplicacion/casos-de-uso/municipio/ObtenerDashboardMunicipal';
import { ObtenerDashboardMunicipalQuerySchema } from '@aplicacion/dtos/municipio/DashboardMunicipalDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Dashboard analítico municipal (Módulo 3). Exclusivo de rol
 * municipio/administrador — verificado en
 * ObtenerDashboardMunicipal.autorizar() (PEA-MUN-005), nunca acá.
 * DashboardMunicipalBuilder (invocado por ese caso de uso) arma la consulta
 * exclusivamente sobre `mv_metricas_reportes_periodo`/
 * `mv_metricas_turnos_periodo` — este endpoint nunca toca `reportes`/`turnos`
 * en vivo, así que su tiempo de respuesta no depende del volumen histórico
 * acumulado (NFR: p95 < 400ms en lecturas, docs/PLANIFICACION.md).
 */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const parametros = ObtenerDashboardMunicipalQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const casoDeUso = container.resolve(ObtenerDashboardMunicipal);
    const resultado = await casoDeUso.ejecutar({ ...parametros, municipioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const mensaje = error.errors[0]?.message;
      const errorNegocio = new PayloadInvalidoError(mensaje);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/municipio/dashboard');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
