import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { RegistrarUsuario } from '@aplicacion/casos-de-uso/auth/RegistrarUsuario';
import type { RegistrarDuenoDto } from '@aplicacion/dtos/auth/RegistrarDuenoDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    const error = new PayloadInvalidoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(RegistrarUsuario);
    // El cast es solo documental: RegistrarUsuario.validar() vuelve a
    // ejecutar RegistrarDuenoSchema.parse() sobre el payload crudo (fail-fast
    // real), así que un payload malformado nunca llega a autorizar/persistir.
    const resultado = await casoDeUso.ejecutar(payload as RegistrarDuenoDto);
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const primerError = error.errors[0]?.message;
      const errorNegocio = new PayloadInvalidoError(primerError);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/auth/registro');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
