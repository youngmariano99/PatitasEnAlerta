import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ListarTurnosVeterinario } from '@aplicacion/casos-de-uso/veterinarios/ListarTurnosVeterinario';
import { ListarTurnosVeterinarioQuerySchema } from '@aplicacion/dtos/veterinarios/ListarTurnosVeterinarioDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Historia "Listado de turnos reservados del veterinario" (Módulo 4):
 * agenda propia — turnos en estado 'reservado', paginados (tope 50) y
 * filtrados exclusivamente por `proveedor_id=usuario_actual()`, nunca los
 * de otro veterinario. Complementa a GET /api/veterinarios/disponibilidad
 * (esa expone la configuración semanal; esta expone quién ocupó cada
 * franja generada a partir de ella).
 */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  const { pagina, porPagina } = ListarTurnosVeterinarioQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

  try {
    const casoDeUso = container.resolve(ListarTurnosVeterinario);
    const resultado = await casoDeUso.ejecutar({ veterinarioId: usuarioAutenticado.id, pagina, porPagina });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/veterinarios/turnos');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
