import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { CambiarEstadoReporteCommand } from '@aplicacion/casos-de-uso/reportes/CambiarEstadoReporteCommand';
import { ActualizarEstadoReporteBodySchema } from '@aplicacion/dtos/reportes/ActualizarEstadoReporteDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
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
 * Cambia el estado de un reporte — Panel municipal (Módulo 2). Exclusivo de
 * rol municipio/administrador, verificado en
 * CambiarEstadoReporteCommand.autorizar() (PEA-REP-007) — nunca en este
 * route handler ni confiando en nada que venga del cliente además del body
 * `{ estado }`.
 */
export async function PATCH(request: NextRequest, { params }: ContextoRuta) {
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
    const { estado } = ActualizarEstadoReporteBodySchema.parse(cuerpo);

    const casoDeUso = container.resolve(CambiarEstadoReporteCommand);
    const resultado = await casoDeUso.ejecutar({
      reporteId: params.id,
      estadoNuevo: estado,
      solicitanteId: usuarioAutenticado.id,
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

    logger.error({ err: error }, 'Error no controlado en PATCH /api/reportes/[id]/estado');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
