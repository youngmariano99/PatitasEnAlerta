import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { RegistrarMascota } from '@aplicacion/casos-de-uso/mascotas/RegistrarMascota';
import type { ComandoRegistrarMascota } from '@aplicacion/dtos/mascotas/RegistrarMascotaDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { FotoObligatoriaError } from '@dominio/errores/erroresMascotas';
import { NoAutenticadoError, AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Un cuerpo con `dueñoId` que no coincide con la sesión actual nunca debería
 * llegar desde el formulario real (app/mascotas/nueva/page.tsx no lo envía).
 * Se acepta como campo opcional únicamente para poder rechazar, con 403 y
 * trazabilidad, un intento explícito de asignar la mascota a otro dueño —
 * defensa en profundidad además de la RLS `mascotas_propio` (docs/ROLES.md).
 */
function tieneDueñoIdDeclaradoDistinto(cuerpo: unknown, usuarioAutenticadoId: string): boolean {
  return (
    typeof cuerpo === 'object' &&
    cuerpo !== null &&
    'dueñoId' in cuerpo &&
    typeof (cuerpo as Record<string, unknown>).dueñoId === 'string' &&
    (cuerpo as Record<string, unknown>).dueñoId !== usuarioAutenticadoId
  );
}

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
    if (tieneDueñoIdDeclaradoDistinto(cuerpo, usuarioAutenticado.id)) {
      logger.warn(
        { usuarioAutenticadoId: usuarioAutenticado.id },
        'Intento de registrar una mascota con dueñoId distinto al usuario autenticado',
      );
      throw new AccesoNoAutorizadoError();
    }

    const comando: ComandoRegistrarMascota = {
      ...(cuerpo as object),
      dueñoId: usuarioAutenticado.id,
    } as ComandoRegistrarMascota;

    const casoDeUso = container.resolve(RegistrarMascota);
    const resultado = await casoDeUso.ejecutar(comando);
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const esFaltaDeFoto = error.errors.some((issue) => issue.path[0] === 'fotoUrl' && issue.code === 'invalid_type');
      const errorNegocio = esFaltaDeFoto ? new FotoObligatoriaError() : new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/mascotas');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
