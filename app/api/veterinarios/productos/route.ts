import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { CrearProductoVeterinario } from '@aplicacion/casos-de-uso/veterinarios-avanzado/CrearProductoVeterinario';
import { ListarProductosActivos } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ListarProductosActivos';
import { ListarProductosQuerySchema } from '@aplicacion/dtos/veterinarios-avanzado/ListarProductosDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Catálogo público de productos veterinarios (Módulo 6, docs/ROLES.md:
 * lectura de `productos_veterinario` es Patrón B — pública, sin sesión, ver
 * middleware.ts `RUTAS_API_LECTURA_PUBLICA`, mismo criterio que
 * `GET /api/reportes`). Es lo que le permite a un dueño descubrir el
 * `productoId` que luego usa en `POST /api/veterinarios/productos/{id}/pedidos`.
 */
export async function GET(request: NextRequest) {
  const { pagina, porPagina } = ListarProductosQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

  try {
    const casoDeUso = container.resolve(ListarProductosActivos);
    const resultado = await casoDeUso.ejecutar({ pagina, porPagina });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/veterinarios/productos');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Alta de un producto del catálogo propio (Módulo 6, Paso 1) — exclusivo de
 * rol `veterinario`, verificado en `CrearProductoVeterinario.autorizar()`
 * (PEA-SIS-002), nunca acá.
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
    const casoDeUso = container.resolve(CrearProductoVeterinario);
    const resultado = await casoDeUso.ejecutar({ datosCrudos: cuerpo, veterinarioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/veterinarios/productos');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
