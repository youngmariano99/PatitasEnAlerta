import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ListarVitrinaAdopcionPublico } from '@aplicacion/casos-de-uso/municipio/ListarVitrinaAdopcionPublico';
import { ListarVitrinaAdopcionPublicoQuerySchema } from '@aplicacion/dtos/municipio/FichaAdopcionDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Vitrina pública de adopción (Módulo 3, Historia "Consulta pública de la
 * vitrina de adopción"). Sin sesión — a diferencia de GET
 * /api/municipio/adopciones (panel, protegido), esta ruta no vive bajo
 * /api/municipio y por lo tanto no cae en ningún prefijo protegido de
 * middleware.ts: es pública por diseño, reforzada además por la RLS
 * `vitrina_select_publico` + `GRANT SELECT ON vitrina_adopcion TO anon`
 * (docs/ROLES.md). Paginada con tope 50 (Paso 2 del ticket).
 */
export async function GET(request: NextRequest) {
  const parametros = ListarVitrinaAdopcionPublicoQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

  try {
    const casoDeUso = container.resolve(ListarVitrinaAdopcionPublico);
    const resultado = await casoDeUso.ejecutar(parametros);
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/adopciones');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
