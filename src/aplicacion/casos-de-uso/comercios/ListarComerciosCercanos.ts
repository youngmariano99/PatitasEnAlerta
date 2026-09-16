import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type {
  ComandoListarComerciosCercanos,
  ComercioCercanoDto,
  PaginaComerciosCercanosDto,
} from '@aplicacion/dtos/comercios/ListarComerciosCercanosDto';
import type { Comercio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';

const RADIO_TIERRA_KM = 6371;

/** Distancia aproximada entre dos puntos (fórmula de Haversine, sin tener en cuenta elevación/elipsoide — "aproximada", AC explícito del ticket). */
function calcularDistanciaKm(origen: { latitud: number; longitud: number }, destino: { latitud: number; longitud: number }): number {
  const radianes = (grados: number) => (grados * Math.PI) / 180;
  const deltaLatitud = radianes(destino.latitud - origen.latitud);
  const deltaLongitud = radianes(destino.longitud - origen.longitud);
  const a =
    Math.sin(deltaLatitud / 2) ** 2 +
    Math.cos(radianes(origen.latitud)) * Math.cos(radianes(destino.latitud)) * Math.sin(deltaLongitud / 2) ** 2;
  return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Template Method (CasoDeUsoBase) — catálogo público de comercios
 * verificados por proximidad (Módulo 7, Historia "Visibilidad geolocalizada
 * frente a dueños de mascotas"). `autorizar()` es un no-op deliberado: sin
 * sesión, sin restricción de rol — mismo criterio que `ListarProductosActivos`
 * (Módulo 6).
 *
 * El bounding box (sobre `ix_comercios_geo`) y el filtro de texto libre
 * (`q`, sobre `nombre_comercio`/`tipo_comercio` — Historia "Búsqueda de
 * comercios y servicios cercanos", siempre vía Prisma parametrizado) viven
 * en `IRepositorioComercios.listarVerificados` — filtran en SQL, pero SIN
 * ordenar ni paginar. El orden por distancia aproximada se hace acá,
 * en la capa de aplicación, sobre el conjunto completo devuelto por el
 * repositorio: solo así el orden es correcto antes de recortar la página —
 * ordenar después de paginar en SQL hubiera dado páginas con el orden
 * equivocado. Sin `zona`, cae al mismo fallback que el resto de los
 * catálogos públicos del proyecto: orden por `createdAt` descendente.
 */
@injectable()
export class ListarComerciosCercanos extends CasoDeUsoBase<ComandoListarComerciosCercanos, PaginaComerciosCercanosDto> {
  constructor(@inject('IRepositorioComercios') private readonly repositorioComercios: IRepositorioComercios) {
    super();
  }

  protected validar(input: ComandoListarComerciosCercanos): ComandoListarComerciosCercanos {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver docstring de la clase.
  }

  protected async persistir(dato: ComandoListarComerciosCercanos): Promise<PaginaComerciosCercanosDto> {
    const zona =
      dato.latitud !== undefined && dato.longitud !== undefined && dato.radioKm !== undefined
        ? { latitud: dato.latitud, longitud: dato.longitud, radioKm: dato.radioKm }
        : undefined;

    const comercios = await this.repositorioComercios.listarVerificados(zona, dato.q);
    const ordenados = zona ? this.ordenarPorDistancia(comercios, zona) : this.ordenarPorFecha(comercios);

    const inicio = (dato.pagina - 1) * dato.porPagina;
    const items = ordenados.slice(inicio, inicio + dato.porPagina);

    return { items, total: comercios.length, pagina: dato.pagina, porPagina: dato.porPagina };
  }

  private ordenarPorDistancia(comercios: Comercio[], origen: { latitud: number; longitud: number }): ComercioCercanoDto[] {
    return comercios
      .map((comercio) => ({ comercio, distanciaKm: calcularDistanciaKm(origen, comercio) }))
      .sort((a, b) => a.distanciaKm - b.distanciaKm)
      .map(({ comercio, distanciaKm }) => this.aDto(comercio, distanciaKm));
  }

  private ordenarPorFecha(comercios: Comercio[]): ComercioCercanoDto[] {
    return [...comercios]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((comercio) => this.aDto(comercio, null));
  }

  private aDto(comercio: Comercio, distanciaKm: number | null): ComercioCercanoDto {
    return {
      id: comercio.id,
      nombreComercio: comercio.nombreComercio,
      tipoComercio: comercio.tipoComercio,
      direccion: comercio.direccion,
      latitud: comercio.latitud,
      longitud: comercio.longitud,
      distanciaKm,
      createdAt: comercio.createdAt.toISOString(),
    };
  }
}
