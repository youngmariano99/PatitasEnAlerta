import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { CompartirHistorial } from '@aplicacion/casos-de-uso/veterinarios-avanzado/CompartirHistorial';
import { ListarHistorialesCompartidos } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ListarHistorialesCompartidos';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError, AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { historialesCompartidosHabilitado } from '@infraestructura/config/featureFlags';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/** "Mis historiales compartidos" (como origen) — mismo gateo por feature flag que POST. */
export async function GET(request: NextRequest) {
  if (!historialesCompartidosHabilitado()) {
    const error = new AccesoNoAutorizadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(ListarHistorialesCompartidos);
    const resultado = await casoDeUso.ejecutar({ veterinarioOrigenId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error(
      { err: error },
      'Error no controlado en GET /api/veterinarios/historiales-compartidos',
    );
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Alta de un historial compartido (Módulo 6, Paso 1). Detrás de feature
 * flag (Paso 3): mientras no esté aprobado el marco de responsabilidad
 * profesional, la función se comporta como si no existiera — 403 con el
 * mismo código genérico anti-enumeración que un fallo de autorización
 * (PEA-SIS-002, docs/DECISIONES.md), chequeado ANTES de la sesión para que
 * el comportamiento no varíe según quién pregunte.
 */
export async function POST(request: NextRequest) {
  if (!historialesCompartidosHabilitado()) {
    const error = new AccesoNoAutorizadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

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
    const casoDeUso = container.resolve(CompartirHistorial);
    const resultado = await casoDeUso.ejecutar({
      datosCrudos: cuerpo,
      veterinarioOrigenId: usuarioAutenticado.id,
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

    logger.error(
      { err: error },
      'Error no controlado en POST /api/veterinarios/historiales-compartidos',
    );
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
