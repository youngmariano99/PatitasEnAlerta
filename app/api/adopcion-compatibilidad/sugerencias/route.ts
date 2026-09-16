import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { GenerarSugerenciasCompatibilidad } from '@aplicacion/casos-de-uso/adopcion-compatibilidad/GenerarSugerenciasCompatibilidad';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Genera sugerencias de compatibilidad sobre el cuestionario propio del
 * usuario autenticado (Módulo 9, Paso 2) — exige cuestionario completo
 * (PEA-ADOP-001 en caso contrario), verificado en
 * `GenerarSugerenciasCompatibilidad.persistir()`, nunca acá.
 */
export async function POST(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(GenerarSugerenciasCompatibilidad);
    const resultado = await casoDeUso.ejecutar({ usuarioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error(
      { err: error },
      'Error no controlado en POST /api/adopcion-compatibilidad/sugerencias',
    );
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
