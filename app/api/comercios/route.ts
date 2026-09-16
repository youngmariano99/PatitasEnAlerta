import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { RegistrarComercio } from '@aplicacion/casos-de-uso/comercios/RegistrarComercio';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Alta de un comercio (Módulo 7, Paso 2) — exclusivo de rol `comerciante`,
 * verificado en `RegistrarComercio.autorizar()` (PEA-SIS-002), nunca acá.
 * Queda en `estado_verificacion='pendiente'` hasta la revisión del
 * Administrador (AC explícito del ticket).
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
    const casoDeUso = container.resolve(RegistrarComercio);
    const resultado = await casoDeUso.ejecutar({ datosCrudos: cuerpo, usuarioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/comercios');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
