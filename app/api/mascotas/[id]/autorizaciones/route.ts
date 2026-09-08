import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { AutorizarVeterinario } from '@aplicacion/casos-de-uso/veterinarios/AutorizarVeterinario';
import { ListarAutorizacionesLibreta } from '@aplicacion/casos-de-uso/veterinarios/ListarAutorizacionesLibreta';
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
 * Historia "Control de accesos a la libreta sanitaria" (Módulo 4, VET-05):
 * historial completo de autorizaciones de la mascota indicada. La
 * pertenencia (¿esta mascota es de quien invoca?) se verifica dentro de
 * `ListarAutorizacionesLibreta.autorizar()`, nunca acá — la RLS
 * `autorizacion_crud_dueño` (docs/ROLES.md) es la última línea de defensa
 * si algo se saltea esta capa.
 */
export async function GET(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(ListarAutorizacionesLibreta);
    const resultado = await casoDeUso.ejecutar({ mascotaId: params.id, dueñoId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/mascotas/[id]/autorizaciones');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Otorga una autorización explícita del dueño hacia un veterinario para
 * escribir en la libreta sanitaria de la mascota indicada. Exclusivo del
 * dueño de esa mascota puntual — verificado en
 * `AutorizarVeterinario.autorizar()` (PEA-SIS-002 / PEA-AUTH-009 /
 * PEA-VET-011 / PEA-VET-009), nunca acá.
 */
export async function POST(request: NextRequest, { params }: ContextoRuta) {
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
    const casoDeUso = container.resolve(AutorizarVeterinario);
    const resultado = await casoDeUso.ejecutar({
      datosCrudos: cuerpo,
      mascotaId: params.id,
      dueñoId: usuarioAutenticado.id,
    });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/mascotas/[id]/autorizaciones');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
