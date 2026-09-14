import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ListarMisProductos } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ListarMisProductos';
import { ListarProductosQuerySchema } from '@aplicacion/dtos/veterinarios-avanzado/ListarProductosDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Catálogo propio de gestión del veterinario autenticado (Módulo 6, Paso 1:
 * "R" del CRUD) — incluye productos sin stock, a diferencia del catálogo
 * público (`GET /api/veterinarios/productos`, solo lectura de terceros).
 */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  const { pagina, porPagina } = ListarProductosQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

  try {
    const casoDeUso = container.resolve(ListarMisProductos);
    const resultado = await casoDeUso.ejecutar({ veterinarioId: usuarioAutenticado.id, pagina, porPagina });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/veterinarios/productos/mis-productos');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
