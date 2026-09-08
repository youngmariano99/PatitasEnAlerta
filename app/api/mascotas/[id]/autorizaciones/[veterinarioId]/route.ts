import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { RevocarAutorizacionLibreta } from '@aplicacion/casos-de-uso/veterinarios/RevocarAutorizacionLibreta';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

interface ContextoRuta {
  params: { id: string; veterinarioId: string };
}

/**
 * Revoca el acceso de un veterinario puntual a la libreta sanitaria de la
 * mascota indicada (Módulo 4, VET-05). Nunca borra la fila: marca
 * `revocada_en` (ver `RevocarAutorizacionLibreta.ts`), lo que preserva el
 * registro auditable de quién tuvo acceso y hasta cuándo. La pertenencia de
 * la mascota se verifica dentro del caso de uso — cualquier id ajeno cae en
 * PEA-SIS-002, nunca revela si la mascota existe.
 */
export async function DELETE(request: NextRequest, { params }: ContextoRuta) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const casoDeUso = container.resolve(RevocarAutorizacionLibreta);
    const resultado = await casoDeUso.ejecutar({
      mascotaId: params.id,
      veterinarioId: params.veterinarioId,
      dueñoId: usuarioAutenticado.id,
    });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en DELETE /api/mascotas/[id]/autorizaciones/[veterinarioId]');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
