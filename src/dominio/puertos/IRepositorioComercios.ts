import type { FiltroZona } from '@dominio/puertos/IRepositorioReportes';

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

  /**
   * Comercios con `estado_verificacion = 'verificado'` (Módulo 7, "Endpoint
   * público de comercios verificados por proximidad"), opcionalmente
   * acotados a un bounding box (`zona`, sobre `ix_comercios_geo`) y/o a un
   * texto libre (`textoLibre`, Módulo 7 "UI de búsqueda y mapa de comercios
   * cercanos" — filtra por `nombre_comercio`/`tipo_comercio`, siempre vía
   * Prisma parametrizado, nunca concatenado en SQL crudo). Devuelve SIEMPRE
   * el conjunto completo que matchea (sin paginar ni ordenar acá): el Paso 3
   * del ticket original exige que el orden por distancia se calcule en la
   * capa de aplicación — `ListarComerciosCercanos.ts` pagina sobre el
   * resultado ya ordenado, no sobre esta consulta.
   */
  listarVerificados(zona?: FiltroZona, textoLibre?: string): Promise<Comercio[]>;
}
