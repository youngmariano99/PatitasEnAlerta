import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type {
  IServicioGeocodificacion,
  ResultadoGeocodificacionInversa,
} from '@dominio/puertos/IServicioGeocodificacion';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';

export interface CoordenadasGeocodificacion {
  lat: number;
  lon: number;
}

/**
 * Template Method (CasoDeUsoBase) aplicado a una consulta de solo lectura —
 * mismo criterio que ObtenerPerfilPropio.ts: no hay noción de "dueño" de una
 * coordenada, cualquier usuario autenticado puede geocodificar cualquier
 * lat/lon (el wizard de reporte ya exige sesión antes de llegar acá), así
 * que `autorizar()` es no-op.
 */
@injectable()
export class ObtenerDireccionAproximada extends CasoDeUsoBase<
  CoordenadasGeocodificacion,
  ResultadoGeocodificacionInversa | null
> {
  constructor(
    @inject('IServicioGeocodificacion')
    private readonly servicioGeocodificacion: IServicioGeocodificacion,
  ) {
    super();
  }

  protected validar(input: CoordenadasGeocodificacion): CoordenadasGeocodificacion {
    const { lat, lon } = input;
    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lon) ||
      lon < -180 ||
      lon > 180
    ) {
      throw new PayloadInvalidoError('Las coordenadas no son válidas.');
    }
    return input;
  }

  protected async autorizar(): Promise<void> {
    // No-op: cualquier usuario autenticado puede geocodificar cualquier coordenada.
  }

  protected async persistir(
    dato: CoordenadasGeocodificacion,
  ): Promise<ResultadoGeocodificacionInversa | null> {
    return this.servicioGeocodificacion.revGeocodificar(dato.lat, dato.lon);
  }
}
