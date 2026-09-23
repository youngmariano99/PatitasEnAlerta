/**
 * @jest-environment node
 */
import { ObtenerDireccionAproximada } from '@aplicacion/casos-de-uso/geocodificacion/ObtenerDireccionAproximada';
import type {
  IServicioGeocodificacion,
  ResultadoGeocodificacionInversa,
} from '@dominio/puertos/IServicioGeocodificacion';

function crearFake(
  resultado: ResultadoGeocodificacionInversa | null,
): jest.Mocked<IServicioGeocodificacion> {
  return { revGeocodificar: jest.fn().mockResolvedValue(resultado) };
}

describe('ObtenerDireccionAproximada', () => {
  it('delega en el servicio de geocodificación con las coordenadas dadas', async () => {
    const resultado: ResultadoGeocodificacionInversa = {
      direccionCorta: 'Av. San Martín 123',
      provincia: 'Buenos Aires',
      pais: 'Argentina',
    };
    const servicio = crearFake(resultado);
    const caso = new ObtenerDireccionAproximada(servicio);

    const respuesta = await caso.ejecutar({ lat: -37.9989, lon: -61.3565 });

    expect(respuesta).toEqual(resultado);
    expect(servicio.revGeocodificar).toHaveBeenCalledWith(-37.9989, -61.3565);
  });

  it('retorna null cuando el servicio no encuentra una dirección (no es un error)', async () => {
    const servicio = crearFake(null);
    const caso = new ObtenerDireccionAproximada(servicio);

    const respuesta = await caso.ejecutar({ lat: -37.9989, lon: -61.3565 });

    expect(respuesta).toBeNull();
  });

  it.each([
    { lat: 91, lon: 0 },
    { lat: -91, lon: 0 },
    { lat: 0, lon: 181 },
    { lat: 0, lon: -181 },
    { lat: NaN, lon: 0 },
  ])('rechaza coordenadas fuera de rango o inválidas ($lat, $lon)', async ({ lat, lon }) => {
    const servicio = crearFake(null);
    const caso = new ObtenerDireccionAproximada(servicio);

    await expect(caso.ejecutar({ lat, lon })).rejects.toThrow('Las coordenadas no son válidas.');
    expect(servicio.revGeocodificar).not.toHaveBeenCalled();
  });
});
