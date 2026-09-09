import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ListarLibretaSanitaria } from '@aplicacion/casos-de-uso/veterinarios/ListarLibretaSanitaria';
import { ListarLibretaSanitariaQuerySchema } from '@aplicacion/dtos/veterinarios/ListarLibretaSanitariaDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
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
 * Historia "Consulta del historial de la libreta sanitaria" (Módulo 4):
 * historial cronológico completo (todas las entradas, de cualquier
 * veterinario) de la mascota indicada, paginado (tope 50). La pertenencia
 * (¿esta mascota es de quien invoca?) se verifica dentro de
 * `ListarLibretaSanitaria.autorizar()`, nunca acá — la RLS `libreta_select`
 * (docs/ROLES.md) es la última línea de defensa si algo se saltea esta capa.
 */
export async function GET(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  const { pagina, porPagina } = ListarLibretaSanitariaQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

  try {
    const casoDeUso = container.resolve(ListarLibretaSanitaria);
    const resultado = await casoDeUso.ejecutar({
      mascotaId: params.id,
      dueñoId: usuarioAutenticado.id,
      pagina,
      porPagina,
    });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/mascotas/[id]/libreta');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
