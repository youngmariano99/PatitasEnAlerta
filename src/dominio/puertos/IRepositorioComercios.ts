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

/** Proyección mínima del comercio propio — lo que necesita `productos_comercio` para autorizar (pertenencia + `estado_verificacion`), sin traer el resto de las columnas. */
export interface ComercioPropio {
  id: string;
  estadoVerificacion: string;
}

/**
 * Puerto hacia `comercios` (Módulo 7, Historia "Registro de comercio en la
 * plataforma"). `obtenerPropio` se agregó en la actividad "CRUD de
 * productos_comercio restringido al comercio propio": resuelve el
 * `comercio_id` del usuario autenticado — nunca confiado desde el body del
 * cliente — para autorizar el CRUD de `productos_comercio`. El resto del
 * CRUD de `comercios` que describe docs/ROLES.md (`comerciante CRUD(p)`, ej.
 * editar los propios datos del comercio) queda para el ticket que
 * implemente esa historia puntual, mismo criterio de entrega incremental
 * que `IRepositorioPedidosProducto`/`IRepositorioHistorialesCompartidos`.
 */
export interface IRepositorioComercios {
  crear(usuarioId: string, datos: DatosComercio): Promise<Comercio>;

  /** El comercio del usuario autenticado, exista o no. `null` si nunca registró uno (o fue soft-deleted, si se agrega esa baja en el futuro). */
  obtenerPropio(usuarioId: string): Promise<ComercioPropio | null>;
}
