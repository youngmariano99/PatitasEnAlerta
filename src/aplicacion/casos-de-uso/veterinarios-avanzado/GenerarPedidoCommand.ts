import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { GenerarPedidoSchema, type ComandoGenerarPedido } from '@aplicacion/dtos/veterinarios-avanzado/GenerarPedidoDto';
import type { IRepositorioProductosVeterinario, ProductoActual } from '@dominio/puertos/IRepositorioProductosVeterinario';
import type { IRepositorioPedidosProducto, PedidoCreado } from '@dominio/puertos/IRepositorioPedidosProducto';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { ProductoNoDisponibleError, StockInsuficienteError } from '@dominio/errores/erroresVeterinariosAvanzados';

const ROL_AUTORIZADO = 'dueño';

/** Payload crudo del cliente + el producto pedido + quién compra, resuelto por el route handler desde la ruta/sesión. */
export interface EntradaGenerarPedido {
  datosCrudos: unknown;
  productoId: string;
  compradorId: string;
}

/** El comando ya validado, con el producto actual adjunto — `persistir()` no vuelve a leerlo, solo lo usa como referencia previa. */
interface ComandoGenerarPedidoValidado extends ComandoGenerarPedido {
  actual: ProductoActual;
}

/**
 * Command (GoF) + Template Method (CasoDeUsoBase) — Historia "Venta de
 * productos veterinarios" (Módulo 6, Pasos 2/3): un dueño genera un pedido
 * sobre un producto del catálogo.
 *
 * `validar()` hace la única lectura de existencia del producto (Zod +
 * `obtenerActual`) y decide ahí mismo si es 404 (PEA-VETADV-002). `autorizar()`
 * exige rol `dueño` (docs/ROLES.md, matriz Módulo 6: `pedidos_producto` es
 * `CR(p)` únicamente para ese rol) — mismo patrón `ROL_AUTORIZADO` singular
 * que `PublicarSolicitudRecurso`/`CrearProductoVeterinario`.
 *
 * `persistir()` nunca confía en la lectura de `validar()`: delega el alta
 * completa en `IRepositorioPedidosProducto.crear()` (Paso 3 — UPDATE
 * condicionado `stock >= cantidad` e INSERT del pedido en una misma
 * transacción). `null` ahí solo puede significar que perdió la carrera por
 * el último stock disponible (la existencia ya se confirmó en `validar()`),
 * lo que se traduce en PEA-VETADV-001 (409) — nunca un error de sistema,
 * mismo criterio que `ReservarTurnoCommand`/`TurnoYaReservadoError`.
 */
@injectable()
export class GenerarPedidoCommand extends CasoDeUsoBase<EntradaGenerarPedido, PedidoCreado, ComandoGenerarPedidoValidado> {
  constructor(
    @inject('IRepositorioProductosVeterinario') private readonly repositorioProductos: IRepositorioProductosVeterinario,
    @inject('IRepositorioPedidosProducto') private readonly repositorioPedidos: IRepositorioPedidosProducto,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected async validar(input: EntradaGenerarPedido): Promise<ComandoGenerarPedidoValidado> {
    const datos = GenerarPedidoSchema.parse(input.datosCrudos);

    const actual = await this.repositorioProductos.obtenerActual(input.productoId);
    if (!actual) {
      throw new ProductoNoDisponibleError();
    }

    return { ...datos, productoId: input.productoId, compradorId: input.compradorId, actual };
  }

  protected async autorizar(dato: ComandoGenerarPedidoValidado): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.compradorId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoGenerarPedidoValidado): Promise<PedidoCreado> {
    const pedido = await this.repositorioPedidos.crear({
      productoId: dato.productoId,
      compradorId: dato.compradorId,
      cantidad: dato.cantidad,
    });
    if (!pedido) {
      throw new StockInsuficienteError();
    }
    return pedido;
  }
}
