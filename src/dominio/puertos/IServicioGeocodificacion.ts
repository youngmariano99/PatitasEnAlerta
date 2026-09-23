export interface ResultadoGeocodificacionInversa {
  /** Etiqueta corta lista para mostrar (ej. "Av. Rivadavia 1200, Coronel Pringles"). */
  direccionCorta: string;
  provincia: string | null;
  pais: string | null;
}

/**
 * Puerto de geocodificación inversa (lat/lon → dirección aproximada) — Hexagonal,
 * mismo criterio que el resto de los puertos del dominio. `null` significa
 * "sin resultado para esa coordenada" (caso normal, no un error); una falla
 * real de la dependencia externa se comunica lanzando
 * `ServicioExternoNoDisponibleError` (ver NominatimGeocodingAdapter.ts).
 */
export interface IServicioGeocodificacion {
  revGeocodificar(lat: number, lon: number): Promise<ResultadoGeocodificacionInversa | null>;
}
