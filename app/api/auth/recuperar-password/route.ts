import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { RecuperarPassword } from '@aplicacion/casos-de-uso/auth/RecuperarPassword';
import type { ComandoRecuperarPassword } from '@aplicacion/dtos/auth/RecuperarPasswordDto';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { logger } from '@infraestructura/logging/logger';

const MENSAJE_GENERICO =
  'Si existe una cuenta con ese email, te enviamos instrucciones para recuperar tu contraseña.';

function respuestaGenerica() {
  return NextResponse.json({ mensaje: MENSAJE_GENERICO }, { status: 200 });
}

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Anti-enumeración (AUTH-06): esta ruta responde EXACTAMENTE lo mismo exista
 * o no una cuenta con el email recibido — el único eje que sí distingue es
 * el formato del payload en sí (aplica igual sin importar qué email se haya
 * escrito, así que no filtra nada sobre cuentas reales).
 */
export async function POST(request: NextRequest) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    const error = new PayloadInvalidoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const redirectTo = new URL('/auth/recuperar-password/nueva', request.nextUrl.origin).toString();
    const casoDeUso = container.resolve(RecuperarPassword);
    await casoDeUso.ejecutar({ ...(cuerpo as object), redirectTo } as ComandoRecuperarPassword);
    return respuestaGenerica();
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }

    // RecuperarPassword.ejecutar() no debería rechazar por ninguna otra
    // causa (ver su contrato) — si igual ocurre algo no controlado, se
    // loguea pero la respuesta al cliente sigue siendo la genérica: nunca
    // se distingue un error interno de un email inexistente.
    logger.error({ err: error }, 'Error no controlado en POST /api/auth/recuperar-password');
    return respuestaGenerica();
  }
}
