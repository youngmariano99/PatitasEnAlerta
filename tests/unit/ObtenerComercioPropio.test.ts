/**
 * @jest-environment node
 */
import { ObtenerComercioPropio } from '@aplicacion/casos-de-uso/comercios/ObtenerComercioPropio';
import type { ComercioPropio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';

const usuarioId = '11111111-1111-1111-1111-111111111111';

function crearFakes(
  comercio: ComercioPropio | null = { id: 'comercio-1', estadoVerificacion: 'pendiente' },
) {
  const repositorioComercios: jest.Mocked<IRepositorioComercios> = {
    crear: jest.fn(),
    obtenerPropio: jest.fn().mockResolvedValue(comercio),
    listarVerificados: jest.fn(),
  };
  return { repositorioComercios };
}

describe('ObtenerComercioPropio', () => {
  it('devuelve el comercio propio del usuario', async () => {
    const { repositorioComercios } = crearFakes();
    const caso = new ObtenerComercioPropio(repositorioComercios);

    const resultado = await caso.ejecutar(usuarioId);

    expect(resultado).toEqual({ id: 'comercio-1', estadoVerificacion: 'pendiente' });
    expect(repositorioComercios.obtenerPropio).toHaveBeenCalledWith(usuarioId);
  });

  it('devuelve null si el usuario todavía no registró un comercio', async () => {
    const { repositorioComercios } = crearFakes(null);
    const caso = new ObtenerComercioPropio(repositorioComercios);

    await expect(caso.ejecutar(usuarioId)).resolves.toBeNull();
  });
});
