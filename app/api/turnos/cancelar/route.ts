import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { CancelarTurnoCommand } from '@aplicacion/casos-de-uso/turnos/CancelarTurnoCommand';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Cancelación de un turno 'reservado' (Módulo 3, Historia "Cancelación o
 * reprogramación de turno propio"). Solo el reservante o el proveedor del
 * turno pueden cancelarlo — verificado en
 * CancelarTurnoCommand.autorizar() (PEA-SIS-002); la RLS `turnos_update`
 * (docs/ROLES.md) es la última línea de defensa si algo se saltea esta
 * capa.
 */
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
    const casoDeUso = container.resolve(CancelarTurnoCommand);
    const resultado = await casoDeUso.ejecutar({ datosCrudos: cuerpo, usuarioId: usuarioAutenticado.id });
    // `proveedorId`/`canceladoPor` son detalles internos para que
    // publicarEvento() decida a quién notificar (Paso 3) — nunca forman
    // parte del contrato público (TurnoCanceladoSchema).
    return NextResponse.json(
      { id: resultado.id, estado: resultado.estado, reservadoPor: resultado.reservadoPor, version: resultado.version },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/turnos/cancelar');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
