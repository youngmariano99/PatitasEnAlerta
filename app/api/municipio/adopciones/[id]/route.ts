import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ActualizarFichaAdopcion } from '@aplicacion/casos-de-uso/municipio/ActualizarFichaAdopcion';
import { DarDeBajaFichaAdopcion } from '@aplicacion/casos-de-uso/municipio/DarDeBajaFichaAdopcion';
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
 * Edición parcial de una ficha de la vitrina de adopción (Módulo 3).
 * Exclusivo de rol municipio/administrador — verificado en
 * ActualizarFichaAdopcion.autorizar() (PEA-MUN-005), nunca acá.
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
    const casoDeUso = container.resolve(ActualizarFichaAdopcion);
    const resultado = await casoDeUso.ejecutar({
      id: params.id,
      datosCrudos: cuerpo,
      municipioId: usuarioAutenticado.id,
    });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en PATCH /api/municipio/adopciones/[id]');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Baja de una ficha (Paso 3 del ticket) — SIEMPRE soft (`estado='baja'`),
 * nunca un DELETE físico de la fila; ver DarDeBajaFichaAdopcion.ts /
 * PrismaFichaAdopcionRepositorio.darDeBaja. Exclusivo de rol municipio/
 * administrador (PEA-MUN-005).
 */
export async function DELETE(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(DarDeBajaFichaAdopcion);
    const resultado = await casoDeUso.ejecutar({ id: params.id, municipioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en DELETE /api/municipio/adopciones/[id]');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
