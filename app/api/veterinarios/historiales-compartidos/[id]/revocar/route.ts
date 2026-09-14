import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { RevocarHistorialCompartido } from '@aplicacion/casos-de-uso/veterinarios-avanzado/RevocarHistorialCompartido';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError, AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { historialesCompartidosHabilitado } from '@infraestructura/config/featureFlags';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

interface ContextoRuta {
  params: { id: string };
}

/**
 * Revocación de un historial compartido activo (Módulo 6, Paso 2) — solo el
 * veterinario origen puede revocar (AC explícito, verificado en
 * RevocarHistorialCompartido.autorizar(), nunca acá). Mismo gateo por
 * feature flag que POST /api/veterinarios/historiales-compartidos.
 */
export async function PATCH(request: NextRequest, { params }: ContextoRuta) {
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
    const casoDeUso = container.resolve(RevocarHistorialCompartido);
    const resultado = await casoDeUso.ejecutar({ historialId: params.id, veterinarioOrigenId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en PATCH /api/veterinarios/historiales-compartidos/[id]/revocar');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
