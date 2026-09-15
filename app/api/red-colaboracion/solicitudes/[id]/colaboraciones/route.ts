import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { OfrecerseComoColaboradorCommand } from '@aplicacion/casos-de-uso/red-colaboracion/OfrecerseComoColaboradorCommand';
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
 * Ofrecimiento como colaborador sobre una solicitud de recurso (Módulo 5 —
 * Red de Colaboración, Post-MVP). Sin body de cliente: `solicitudId` viene
 * de la ruta, `stakeholderId` siempre de la sesión autenticada. La
 * autorización por rol (rescatista/veterinario) y el resto de las reglas de
 * negocio (solicitud abierta, sin ofrecimiento duplicado) se resuelven en
 * OfrecerseComoColaboradorCommand.autorizar() (PEA-SIS-002/PEA-RED-001/002/003),
 * nunca acá.
 */
export async function POST(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(OfrecerseComoColaboradorCommand);
    const resultado = await casoDeUso.ejecutar({
      solicitudId: params.id,
      stakeholderId: usuarioAutenticado.id,
    });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/red-colaboracion/solicitudes/[id]/colaboraciones');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
