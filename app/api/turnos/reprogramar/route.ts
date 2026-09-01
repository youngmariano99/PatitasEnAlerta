import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ReprogramarTurnoCommand } from '@aplicacion/casos-de-uso/turnos/ReprogramarTurnoCommand';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Reprogramación de un turno propio (Módulo 3, Historia "Cancelación o
 * reprogramación de turno propio", Paso 2). Cancela `turnoActualId` y
 * reserva `turnoNuevoId` dentro de una única transacción Prisma (todo o
 * nada) — ver ReprogramarTurnoCommand.persistir() /
 * IRepositorioTurnos.reprogramar. Exclusivo del reservante del turno
 * actual (PEA-SIS-002 para cualquier otro).
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
    const casoDeUso = container.resolve(ReprogramarTurnoCommand);
    const resultado = await casoDeUso.ejecutar({ datosCrudos: cuerpo, usuarioId: usuarioAutenticado.id });
    // `proveedorId` es un detalle interno del turno cancelado (nunca forma
    // parte del contrato público, TurnoCanceladoSchema) — mismo criterio
    // que POST /api/turnos/cancelar.
    return NextResponse.json(
      {
        turnoCancelado: {
          id: resultado.turnoCancelado.id,
          estado: resultado.turnoCancelado.estado,
          reservadoPor: resultado.turnoCancelado.reservadoPor,
          version: resultado.turnoCancelado.version,
        },
        turnoReservado: resultado.turnoReservado,
      },
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

    logger.error({ err: error }, 'Error no controlado en POST /api/turnos/reprogramar');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
