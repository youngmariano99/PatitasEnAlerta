import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ActualizarEstadoPedidoSchema,
  type DatosActualizarEstadoPedido,
} from '@aplicacion/dtos/veterinarios-avanzado/PedidoProductoDto';
import type {
  IRepositorioPedidosProducto,
  PedidoCreado,
} from '@dominio/puertos/IRepositorioPedidosProducto';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { PedidoNoTransicionableError } from '@dominio/errores/erroresVeterinariosAvanzados';

const ROL_AUTORIZADO = 'veterinario';

export interface EntradaActualizarEstadoPedido {
  datosCrudos: unknown;
  pedidoId: string;
  veterinarioId: string;
}

interface ComandoActualizarEstadoPedidoValidado extends DatosActualizarEstadoPedido {
  pedidoId: string;
  veterinarioId: string;
}

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — completa el ciclo de
 * vida de `pedidos_producto` que `GenerarPedidoCommand` dejó pendiente
 * (`veterinario RU(p, de sus productos)`, docs/ROLES.md Módulo 6): el
 * veterinario dueño del producto confirma o cancela un pedido recibido.
 *
 * `persistir()` nunca confía en una lectura previa: delega la transición
 * completa (ownership + máquina de estados) en
 * `IRepositorioPedidosProducto.actualizarEstado()`, mismo criterio
 * anti-carrera que `GenerarPedidoCommand` — `null` se traduce siempre a
 * PEA-VETADV-004 (409), sin distinguir "no existe" de "no es propio" de
 * "ya no está pendiente".
 */
@injectable()
export class ActualizarEstadoPedido extends CasoDeUsoBase<
  EntradaActualizarEstadoPedido,
  PedidoCreado,
  ComandoActualizarEstadoPedidoValidado
> {
  constructor(
    @inject('IRepositorioPedidosProducto')
    private readonly repositorioPedidos: IRepositorioPedidosProducto,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaActualizarEstadoPedido): ComandoActualizarEstadoPedidoValidado {
    const datos = ActualizarEstadoPedidoSchema.parse(input.datosCrudos);
    return { ...datos, pedidoId: input.pedidoId, veterinarioId: input.veterinarioId };
  }

  protected async autorizar(dato: ComandoActualizarEstadoPedidoValidado): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoActualizarEstadoPedidoValidado): Promise<PedidoCreado> {
    const pedido = await this.repositorioPedidos.actualizarEstado(
      dato.pedidoId,
      dato.veterinarioId,
      dato.estado,
    );
    if (!pedido) {
      throw new PedidoNoTransicionableError();
    }
    return pedido;
  }
}
