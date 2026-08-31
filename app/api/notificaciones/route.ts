import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ListarNotificacionesPropias } from '@aplicacion/casos-de-uso/notificaciones/ListarNotificacionesPropias';
import { ListarNotificacionesQuerySchema } from '@aplicacion/dtos/notificaciones/NotificacionesDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/** Bandeja propia de notificaciones, paginada (tope 50) — nunca la de otro usuario. */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  const { pagina, porPagina } = ListarNotificacionesQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  try {
    const casoDeUso = container.resolve(ListarNotificacionesPropias);
    const resultado = await casoDeUso.ejecutar({ solicitanteId: usuarioAutenticado.id, pagina, porPagina });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/notificaciones');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
