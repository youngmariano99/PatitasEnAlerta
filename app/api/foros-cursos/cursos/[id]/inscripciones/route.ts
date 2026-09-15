import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { InscribirseCurso } from '@aplicacion/casos-de-uso/foros-cursos/InscribirseCurso';
import { DarDeBajaInscripcionCurso } from '@aplicacion/casos-de-uso/foros-cursos/DarDeBajaInscripcionCurso';
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
 * Inscripción propia a un curso (Módulo 8, Paso 1) — abierto a cualquier
 * usuario autenticado, sin restricción de rol (docs/ROLES.md). La
 * duplicación (PEA-FORO-001) se detecta en
 * `InscribirseCurso.persistir()` capturando la violación de
 * `ux_inscripcion_curso_usuario`, nunca acá.
 */
export async function POST(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(InscribirseCurso);
    const resultado = await casoDeUso.ejecutar({ datosCrudos: { cursoId: params.id }, usuarioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/foros-cursos/cursos/[id]/inscripciones');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Baja de la inscripción propia a un curso (Módulo 8, Paso 3) — exclusiva
 * del propio usuario: `usuarioId` sale siempre de la sesión, nunca del
 * cliente, así que este endpoint no puede afectar la inscripción de nadie
 * más.
 */
export async function DELETE(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(DarDeBajaInscripcionCurso);
    const resultado = await casoDeUso.ejecutar({ datosCrudos: { cursoId: params.id }, usuarioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en DELETE /api/foros-cursos/cursos/[id]/inscripciones');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
