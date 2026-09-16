import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ListarComerciosCercanos } from '@aplicacion/casos-de-uso/comercios/ListarComerciosCercanos';
import { ListarComerciosCercanosQuerySchema } from '@aplicacion/dtos/comercios/ListarComerciosCercanosDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Catálogo público de comercios verificados por proximidad (Módulo 7, sin
 * sesión — docs/ROLES.md: lectura de `comercios` verificados es Patrón B,
 * ver middleware.ts `RUTAS_API_LECTURA_PUBLICA`, mismo criterio que
 * `GET /api/veterinarios/productos`).
 */
export async function GET(request: NextRequest) {
  let query: ReturnType<typeof ListarComerciosCercanosQuerySchema.parse>;
  try {
    query = ListarComerciosCercanosQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  } catch {
    const error = new PayloadInvalidoError('Para filtrar por proximidad, indicá latitud, longitud y radioKm juntos.');
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(ListarComerciosCercanos);
    const resultado = await casoDeUso.ejecutar(query);
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/comercios/cercanos');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
