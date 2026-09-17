import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { PublicarSolicitudRecurso } from '@aplicacion/casos-de-uso/red-colaboracion/PublicarSolicitudRecurso';
import { ListarSolicitudesAbiertas } from '@aplicacion/casos-de-uso/red-colaboracion/ListarSolicitudesAbiertas';
import { ListarSolicitudesAbiertasQuerySchema } from '@aplicacion/dtos/red-colaboracion/ListarSolicitudesAbiertasDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/** Todas las solicitudes de recurso abiertas (cualquier tipo), paginadas — para navegar y ofrecerse como colaborador. */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const { pagina, porPagina } = ListarSolicitudesAbiertasQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const casoDeUso = container.resolve(ListarSolicitudesAbiertas);
    const resultado = await casoDeUso.ejecutar({ pagina, porPagina });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/red-colaboracion/solicitudes');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Publicación de solicitudes de recurso (Módulo 5 — Red de Colaboración,
 * Post-MVP). Exclusivo de rol `organizacion` — verificado en
 * PublicarSolicitudRecurso.autorizar() (PEA-SIS-002), nunca acá: la futura
 * RLS `solicitudes_recurso_insert_propia` (patrón D, docs/ROLES.md 3.5) es
 * la última línea de defensa si algo se saltea esta capa.
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
    const casoDeUso = container.resolve(PublicarSolicitudRecurso);
    const resultado = await casoDeUso.ejecutar({
      datosCrudos: cuerpo,
      organizacionId: usuarioAutenticado.id,
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

    logger.error({ err: error }, 'Error no controlado en POST /api/red-colaboracion/solicitudes');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
