import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ActualizarEstadoColaboracionCommand } from '@aplicacion/casos-de-uso/red-colaboracion/ActualizarEstadoColaboracionCommand';
import { ActualizarEstadoColaboracionBodySchema } from '@aplicacion/dtos/red-colaboracion/ActualizarEstadoColaboracionDto';
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
 * Cambia el estado de una colaboración (aceptar/rechazar/completar) — hilo
 * de coordinación de la Organización (Módulo 5). Exclusivo de la
 * organización dueña de la solicitud asociada, verificado en
 * ActualizarEstadoColaboracionCommand.autorizar() (PEA-RED-004) — nunca en
 * este route handler ni confiando en nada que venga del cliente además del
 * body `{ estado }`.
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
    const { estado } = ActualizarEstadoColaboracionBodySchema.parse(cuerpo);

    const casoDeUso = container.resolve(ActualizarEstadoColaboracionCommand);
    const resultado = await casoDeUso.ejecutar({
      colaboracionId: params.id,
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

    logger.error({ err: error }, 'Error no controlado en PATCH /api/red-colaboracion/colaboraciones/[id]/estado');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
