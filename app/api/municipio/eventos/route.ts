import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { CrearEvento } from '@aplicacion/casos-de-uso/municipio/CrearEvento';
import { ListarEventosPublico } from '@aplicacion/casos-de-uso/municipio/ListarEventosPublico';
import { ListarEventosPublicoQuerySchema } from '@aplicacion/dtos/municipio/ListarEventosPublicoDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Calendario público de operativos (Módulo 3, Historia "Calendario público
 * de operativos"). Sin sesión — ver middleware.ts (RUTAS_API_LECTURA_PUBLICA
 * exime este GET puntual del prefijo protegido /api/municipio) y RLS
 * `eventos_select_publico` + `GRANT SELECT ON eventos TO anon`
 * (docs/ROLES.md). Paginado con tope 50 (Paso 3 del ticket).
 */
export async function GET(request: NextRequest) {
  let parametros: ReturnType<typeof ListarEventosPublicoQuerySchema.parse>;
  try {
    parametros = ListarEventosPublicoQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  } catch (error) {
    const mensaje = error instanceof ZodError ? error.errors[0]?.message : undefined;
    const errorNegocio = new PayloadInvalidoError(mensaje);
    return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(ListarEventosPublico);
    const resultado = await casoDeUso.ejecutar(parametros);
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/municipio/eventos');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Alta rápida de un operativo municipal (Módulo 3). Exclusivo de rol
 * municipio/administrador — verificado en CrearEvento.autorizar()
 * (PEA-MUN-005), nunca acá: la RLS `eventos_crud_municipio` (docs/ROLES.md)
 * es la última línea de defensa si algo se saltea esta capa.
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
    const casoDeUso = container.resolve(CrearEvento);
    const resultado = await casoDeUso.ejecutar({ datosCrudos: cuerpo, municipioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/municipio/eventos');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
