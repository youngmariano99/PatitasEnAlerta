import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ListarReportes } from '@aplicacion/casos-de-uso/reportes/ListarReportes';
import { ListarReportesQuerySchema } from '@aplicacion/dtos/reportes/ListarReportesDto';
import { ConRateLimitDecorator } from '@infraestructura/decoradores/ConRateLimitDecorator';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { LimiteDeReportesExcedidoError } from '@dominio/errores/erroresReportes';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number, headers?: HeadersInit) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp, headers });
}

/** PEA-REP-004 (429): cabecera Retry-After cuando ConRateLimitDecorator.ts la informó (Paso 3 del ticket). */
function cabecerasDeError(error: ErrorDominio): HeadersInit | undefined {
  if (error instanceof LimiteDeReportesExcedidoError && error.reintentarEnSegundos !== undefined) {
    return { 'Retry-After': String(error.reintentarEnSegundos) };
  }
  return undefined;
}

/**
 * Listado público (sin sesión — ver middleware.ts, GET /api/reportes queda
 * fuera de la protección aunque el resto del path esté protegido) de
 * reportes activos, paginado (tope 50) con filtros tipo/estado/zona.
 */
export async function GET(request: NextRequest) {
  let parametros: ReturnType<typeof ListarReportesQuerySchema.parse>;
  try {
    parametros = ListarReportesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  } catch (error) {
    const mensaje = error instanceof ZodError ? error.errors[0]?.message : undefined;
    const errorNegocio = new PayloadInvalidoError(mensaje);
    return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(ListarReportes);
    const resultado = await casoDeUso.ejecutar(parametros);
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/reportes');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    const error = new PayloadInvalidoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    // ConRateLimitDecorator (Decorator, GoF) en vez de CrearReporte directo:
    // suma el límite anti-saturación (5/hora, usuarios no verificados) por
    // fuera del caso de uso, sin que este último se entere de su existencia.
    const casoDeUso = container.resolve(ConRateLimitDecorator);
    const resultado = await casoDeUso.ejecutar({
      datosCrudos: cuerpo,
      reportadoPor: usuarioAutenticado.id,
    });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp, cabecerasDeError(error));
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/reportes');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
