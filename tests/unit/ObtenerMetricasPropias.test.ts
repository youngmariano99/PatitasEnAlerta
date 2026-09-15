/**
 * @jest-environment node
 */
import { ObtenerMetricasPropias } from '@aplicacion/casos-de-uso/red-colaboracion/ObtenerMetricasPropias';
import type { IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';

const stakeholderId = '33333333-3333-3333-3333-333333333333';

function crearFakes() {
  const repositorioColaboraciones: jest.Mocked<IRepositorioColaboraciones> = {
    obtenerActual: jest.fn(),
    actualizarEstado: jest.fn(),
    listarHistorialEstado: jest.fn(),
    existePropuestaDe: jest.fn(),
    crear: jest.fn(),
    obtenerMetricasPropias: jest.fn().mockResolvedValue({ totalCompletadas: 4, porTipo: { transito: 3, insumos: 1 } }),
  };
  return { repositorioColaboraciones };
}

describe('ObtenerMetricasPropias', () => {
  it('delega en el repositorio, pasando el stakeholderId del solicitante', async () => {
    const { repositorioColaboraciones } = crearFakes();
    const comando = new ObtenerMetricasPropias(repositorioColaboraciones);

    const resultado = await comando.ejecutar({ stakeholderId });

    expect(resultado).toEqual({ totalCompletadas: 4, porTipo: { transito: 3, insumos: 1 } });
    expect(repositorioColaboraciones.obtenerMetricasPropias).toHaveBeenCalledWith(stakeholderId);
  });

  it('no expone ningún campo comparativo o de ranking en el resultado', async () => {
    const { repositorioColaboraciones } = crearFakes();
    const comando = new ObtenerMetricasPropias(repositorioColaboraciones);

    const resultado = await comando.ejecutar({ stakeholderId });

    expect(Object.keys(resultado).sort()).toEqual(['porTipo', 'totalCompletadas']);
  });

  it('devuelve el agregado vacío (0, sin desglose) si el usuario nunca completó ninguna colaboración', async () => {
    const repositorioColaboraciones: jest.Mocked<IRepositorioColaboraciones> = {
      obtenerActual: jest.fn(),
      actualizarEstado: jest.fn(),
      listarHistorialEstado: jest.fn(),
      existePropuestaDe: jest.fn(),
      crear: jest.fn(),
      obtenerMetricasPropias: jest.fn().mockResolvedValue({ totalCompletadas: 0, porTipo: {} }),
    };
    const comando = new ObtenerMetricasPropias(repositorioColaboraciones);

    const resultado = await comando.ejecutar({ stakeholderId });

    expect(resultado).toEqual({ totalCompletadas: 0, porTipo: {} });
  });
});
