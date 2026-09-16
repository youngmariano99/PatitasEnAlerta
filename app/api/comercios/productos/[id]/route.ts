import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ActualizarProductoComercio } from '@aplicacion/casos-de-uso/comercios/ActualizarProductoComercio';
import { DarDeBajaProductoComercio } from '@aplicacion/casos-de-uso/comercios/DarDeBajaProductoComercio';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
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
 * Edición de un producto propio (Módulo 7, Paso 1). Solo el comercio dueño
 * del producto puede editarlo — verificado en
 * ActualizarProductoComercio.autorizar() (PEA-SIS-002, AC explícito del
 * ticket), nunca acá.
 */
export async function PATCH(request: NextRequest, { params }: ContextoRuta) {
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
    const casoDeUso = container.resolve(ActualizarProductoComercio);
    const resultado = await casoDeUso.ejecutar({ datosCrudos: cuerpo, productoId: params.id, usuarioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en PATCH /api/comercios/productos/[id]');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/** Baja (soft delete) de un producto propio (Módulo 7, Paso 1) — mismo criterio de pertenencia exclusiva que PATCH. */
export async function DELETE(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(DarDeBajaProductoComercio);
    const resultado = await casoDeUso.ejecutar({ productoId: params.id, usuarioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en DELETE /api/comercios/productos/[id]');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
