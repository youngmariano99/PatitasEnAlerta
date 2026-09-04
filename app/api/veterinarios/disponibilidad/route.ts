import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ConfigurarDisponibilidad } from '@aplicacion/casos-de-uso/veterinarios/ConfigurarDisponibilidad';
import { ListarDisponibilidadPropia } from '@aplicacion/casos-de-uso/veterinarios/ListarDisponibilidadPropia';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * "Configuración de agenda del veterinario" (Módulo 4): vista completa de
 * la agenda semanal propia (activa e inactiva). Exclusivo de sesión propia
 * — filtrado por `veterinarioId` derivado de ella, nunca del cliente.
 */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(ListarDisponibilidadPropia);
    const resultado = await casoDeUso.ejecutar({ veterinarioId: usuarioAutenticado.id });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/veterinarios/disponibilidad');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Configura (crea o actualiza) la franja de agenda propia para un día de la
 * semana. Exclusivo de rol veterinario con matrícula verificada —
 * verificado en `ConfigurarDisponibilidad.autorizar()` (PEA-SIS-002 /
 * PEA-VET-007), nunca acá: la RLS `disponibilidad_propio` (docs/ROLES.md)
 * es la última línea de defensa si algo se saltea esta capa.
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
    const casoDeUso = container.resolve(ConfigurarDisponibilidad);
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

    logger.error({ err: error }, 'Error no controlado en POST /api/veterinarios/disponibilidad');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
