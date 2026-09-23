import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { ObtenerDireccionAproximada } from '@aplicacion/casos-de-uso/geocodificacion/ObtenerDireccionAproximada';
import type { IControlDeTasaConReintento } from '@dominio/puertos/IControlDeTasaConReintento';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import {
  LimiteDeConsultasExcedidoError,
  NoAutenticadoError,
} from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(
  codigo: string,
  mensaje: string,
  statusHttp: number,
  headers?: HeadersInit,
) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp, headers });
}

/**
 * Geocodificación inversa (lat/lon → dirección aproximada) — solo consumida
 * hoy por el paso de ubicación del wizard de reporte (siempre autenticado,
 * `/reportes/nuevo` ya exige sesión). Rate limit por usuario (no por IP: no
 * hay caso de uso anónimo para esta ruta) vía IControlDeTasaGeocoding, antes
 * de invocar el caso de uso.
 */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lon = Number(request.nextUrl.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const error = new PayloadInvalidoError('Las coordenadas no son válidas.');
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  const controlDeTasa = container.resolve<IControlDeTasaConReintento>('IControlDeTasaGeocoding');
  const { permitido, reintentarEnSegundos } = await controlDeTasa.evaluar(usuarioAutenticado.id);
  if (!permitido) {
    const error = new LimiteDeConsultasExcedidoError(reintentarEnSegundos);
    return respuestaDeError(error.codigo, error.message, error.statusHttp, {
      'Retry-After': String(reintentarEnSegundos),
    });
  }

  try {
    const casoDeUso = container.resolve(ObtenerDireccionAproximada);
    const resultado = await casoDeUso.ejecutar({ lat, lon });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/geocoding/reverse');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
