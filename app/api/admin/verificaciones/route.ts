import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ListarVerificacionesPendientes } from '@aplicacion/casos-de-uso/auth/ListarVerificacionesPendientes';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { obtenerUsuarioAutenticado } from '@infraestructura/adaptadores/ContextoAutenticacionSupabase';
import { logger } from '@infraestructura/logging/logger';

const TOPE_POR_PAGINA = 50;

const ParametrosSchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  porPagina: z.coerce.number().int().min(1).max(TOPE_POR_PAGINA).catch(TOPE_POR_PAGINA),
});

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Cola de verificaciones pendientes (AUTH-08, Paso 1) — exclusiva de rol
 * administrador (verificado en ListarVerificacionesPendientes.autorizar()).
 * Paginación server-side, tope 50 por página, ordenada por created_at.
 */
export async function GET(request: NextRequest) {
  const usuarioAutenticado = await obtenerUsuarioAutenticado(request);
  if (!usuarioAutenticado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  const { pagina, porPagina } = ParametrosSchema.parse({
    pagina: request.nextUrl.searchParams.get('pagina') ?? undefined,
    porPagina: request.nextUrl.searchParams.get('porPagina') ?? undefined,
  });

  try {
    const casoDeUso = container.resolve(ListarVerificacionesPendientes);
    const resultado = await casoDeUso.ejecutar({ solicitanteId: usuarioAutenticado.id, pagina, porPagina });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en GET /api/admin/verificaciones');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
