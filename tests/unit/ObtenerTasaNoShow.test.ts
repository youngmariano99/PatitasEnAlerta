/**
 * @jest-environment node
 */
import { ObtenerTasaNoShow } from '@aplicacion/casos-de-uso/turnos/ObtenerTasaNoShow';
import type { IRepositorioTurnos } from '@dominio/puertos/IRepositorioTurnos';

const proveedorId = '11111111-1111-1111-1111-111111111111';

function crearFakes() {
  const repositorioTurnos: jest.Mocked<IRepositorioTurnos> = {
    contarDisponiblesPorEvento: jest.fn(),
    crearLote: jest.fn(),
    obtenerActual: jest.fn(),
    reservar: jest.fn(),
    listarPropios: jest.fn(),
    cancelar: jest.fn(),
    reprogramar: jest.fn(),
    listarFranjasExistentes: jest.fn(),
    listarReservadosPorProveedor: jest.fn(),
    listarReservadosEnVentana: jest.fn(),
    actualizarAsistio: jest.fn(),
    calcularTasaNoShow: jest
      .fn()
      .mockResolvedValue({ totalConcluidos: 10, totalNoShow: 4, tasa: 0.4 }),
    listarPorEvento: jest.fn(),
  };
  return { repositorioTurnos };
}

describe('ObtenerTasaNoShow', () => {
  it('Paso 3: delega en el repositorio pasando el proveedorId del solicitante', async () => {
    const { repositorioTurnos } = crearFakes();
    const comando = new ObtenerTasaNoShow(repositorioTurnos);

    const resultado = await comando.ejecutar({ proveedorId });

    expect(resultado).toEqual({ totalConcluidos: 10, totalNoShow: 4, tasa: 0.4 });
    expect(repositorioTurnos.calcularTasaNoShow).toHaveBeenCalledWith(proveedorId);
  });

  it('cualquier usuario autenticado puede invocarlo — el aislamiento lo garantiza el filtro del repositorio, no un chequeo de rol', async () => {
    const { repositorioTurnos } = crearFakes();
    const comando = new ObtenerTasaNoShow(repositorioTurnos);

    await expect(comando.ejecutar({ proveedorId: 'usuario-sin-turnos' })).resolves.toBeDefined();
    expect(repositorioTurnos.calcularTasaNoShow).toHaveBeenCalledWith('usuario-sin-turnos');
  });
});
