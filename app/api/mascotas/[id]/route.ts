import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ObtenerMascotaPropia } from '@aplicacion/casos-de-uso/mascotas/ObtenerMascotaPropia';
import { ActualizarMascota } from '@aplicacion/casos-de-uso/mascotas/ActualizarMascota';
import { DarDeBajaMascota } from '@aplicacion/casos-de-uso/mascotas/DarDeBajaMascota';
import type { ComandoActualizarMascota } from '@aplicacion/dtos/mascotas/ActualizarMascotaDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

interface ContextoRuta {
  params: { id: string };
}

/**
 * Ficha individual de una mascota propia (Módulo 1: "ver mascota"). La
 * pertenencia se verifica dentro de `ObtenerMascotaPropia.persistir()`,
 * nunca acá — la RLS `mascotas_propio` (docs/ROLES.md) es la última línea
 * de defensa si algo se saltea esta capa.
 */
export async function GET(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(ObtenerMascotaPropia);
    const resultado = await casoDeUso.ejecutar({
      id: params.id,
      dueñoIdSolicitante: usuarioAutenticado.id,
    });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/mascotas/[id]');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Edición parcial de una mascota propia (Módulo 1: "editar mascota"). Caso
 * de uso y tests ya existían (Sprint 1) — solo faltaba este route handler
 * HTTP, documentado como deuda técnica en docs/AUDITORIA_SISTEMA.md Sección 2.
 */
export async function PATCH(request: NextRequest, { params }: ContextoRuta) {
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
    const comando: ComandoActualizarMascota = {
      ...(cuerpo as object),
      id: params.id,
      dueñoIdSolicitante: usuarioAutenticado.id,
    } as ComandoActualizarMascota;

    const casoDeUso = container.resolve(ActualizarMascota);
    const resultado = await casoDeUso.ejecutar(comando);
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en PATCH /api/mascotas/[id]');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}

/**
 * Baja (soft delete) de una mascota propia (Módulo 1: "dar de baja
 * mascota"). Caso de uso y tests ya existían (Sprint 1) — solo faltaba este
 * route handler HTTP, documentado como deuda técnica en
 * docs/AUDITORIA_SISTEMA.md Sección 2.
 */
export async function DELETE(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(DarDeBajaMascota);
    const resultado = await casoDeUso.ejecutar({
      id: params.id,
      dueñoIdSolicitante: usuarioAutenticado.id,
    });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en DELETE /api/mascotas/[id]');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
