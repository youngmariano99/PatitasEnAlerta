import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { CrearCuentaMunicipio } from '@aplicacion/casos-de-uso/auth/CrearCuentaMunicipio';
import type { ComandoCrearCuentaMunicipio } from '@aplicacion/dtos/auth/CrearCuentaMunicipioDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Alta de la cuenta institucional del Municipio (AUTH-03) — exclusiva de
 * rol administrador, sin autoservicio. La verificación de rol vive en el
 * caso de uso (CrearCuentaMunicipio.autorizar, vía rol_actual() del
 * solicitante) siguiendo el mismo criterio que el resto de las rutas de
 * API del proyecto (mascotas, perfil): cada una resuelve su propia
 * autorización porque necesitan responder JSON, nunca una redirección de
 * página como hace middleware.ts para las rutas protegidas de UI.
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
    const comando: ComandoCrearCuentaMunicipio = {
      ...(cuerpo as object),
      solicitanteId: usuarioAutenticado.id,
    } as ComandoCrearCuentaMunicipio;

    const casoDeUso = container.resolve(CrearCuentaMunicipio);
    const resultado = await casoDeUso.ejecutar(comando);
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/admin/municipio');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
