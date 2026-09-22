import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { ActualizarEstadoPedido } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ActualizarEstadoPedido';
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
 * Confirma o cancela un pedido recibido (Módulo 6, ciclo de vida completo de
 * `pedidos_producto`). Solo el veterinario dueño del producto pedido puede
 * hacerlo — verificado en `IRepositorioPedidosProducto.actualizarEstado()`
 * vía `ActualizarEstadoPedido.persistir()`, nunca acá.
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
    const casoDeUso = container.resolve(ActualizarEstadoPedido);
    const resultado = await casoDeUso.ejecutar({
      datosCrudos: cuerpo,
      pedidoId: params.id,
      veterinarioId: usuarioAutenticado.id,
    });
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errorNegocio = new PayloadInvalidoError(error.errors[0]?.message);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error(
      { err: error },
      'Error no controlado en PATCH /api/veterinarios/pedidos-recibidos/[id]',
    );
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
