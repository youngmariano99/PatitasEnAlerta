import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ListarMisTurnos } from '@aplicacion/casos-de-uso/turnos/ListarMisTurnos';
import { ListarMisTurnosQuerySchema } from '@aplicacion/dtos/turnos/ListarMisTurnosDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Paso 1 del ticket "Suscripción Realtime a turnos propios": lectura de
 * turnos propios, paginada (tope 50) y filtrada exclusivamente por
 * `reservado_por=usuario_actual()` — nunca los de otro usuario. Es el
 * estado inicial de app/turnos/mis-turnos/page.tsx; a partir de ahí, la
 * suscripción Realtime (Postgres Changes, mismo filtro) mantiene la vista
 * al día sin volver a golpear este endpoint.
 */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  const { pagina, porPagina } = ListarMisTurnosQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

  try {
    const casoDeUso = container.resolve(ListarMisTurnos);
    const resultado = await casoDeUso.ejecutar({ solicitanteId: usuarioAutenticado.id, pagina, porPagina });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/turnos/mis-turnos');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
