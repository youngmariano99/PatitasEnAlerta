export interface DatosComercio {
  nombreComercio: string;
  tipoComercio: string;
  direccion: string;
  latitud: number;
  longitud: number;
}

/** Fila de `comercios` (docs/SCHEMA.md, Módulo 7). `estadoVerificacion` siempre nace en 'pendiente' — la aplicación nunca la fija, es el `DEFAULT` de la columna. */
export interface Comercio extends DatosComercio {
  id: string;
  usuarioId: string;
  estadoVerificacion: string;
  createdAt: Date;
}

/**
 * Puerto hacia `comercios` (Módulo 7, Historia "Registro de comercio en la
 * plataforma"). Acotado al alta — el resto del CRUD que describe
 * docs/ROLES.md (`comerciante CRUD(p)`) queda para el ticket que implemente
 * esa historia puntual, mismo criterio de entrega incremental que
 * `IRepositorioPedidosProducto`/`IRepositorioHistorialesCompartidos`.
 */
export interface IRepositorioComercios {
  crear(usuarioId: string, datos: DatosComercio): Promise<Comercio>;
}
