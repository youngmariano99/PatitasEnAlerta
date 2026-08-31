/**
 * @jest-environment node
 */
import { ListarReportes } from '@aplicacion/casos-de-uso/reportes/ListarReportes';
import type { IRepositorioReportes, PaginaReportes } from '@dominio/puertos/IRepositorioReportes';
import type { ParametrosListarReportes } from '@aplicacion/dtos/reportes/ListarReportesDto';

function crearFakes(pagina: PaginaReportes) {
  const repositorioReportes: jest.Mocked<IRepositorioReportes> = {
    crear: jest.fn(),
    buscarPerdidosActivosPorZonaYEspecie: jest.fn(),
    listar: jest.fn().mockResolvedValue(pagina),
    obtenerEstadoActual: jest.fn(),
    actualizarEstado: jest.fn(),
    obtenerPropietario: jest.fn(),
    listarHistorialEstado: jest.fn(),
  };
  return { repositorioReportes };
}

const paginaVacia: PaginaReportes = { items: [], total: 0, pagina: 1, porPagina: 50 };

const parametrosBase: ParametrosListarReportes = {
  pagina: 1,
  porPagina: 50,
  tipo: undefined,
  estado: undefined,
  latitud: undefined,
  longitud: undefined,
  radioKm: undefined,
};

describe('ListarReportes', () => {
  it('delega en el repositorio sin filtros cuando no se declaran', async () => {
    const { repositorioReportes } = crearFakes(paginaVacia);
    const caso = new ListarReportes(repositorioReportes);

    await caso.ejecutar(parametrosBase);

    expect(repositorioReportes.listar).toHaveBeenCalledWith({ tipo: undefined, estado: undefined, zona: undefined }, 1, 50);
  });

  it('traduce latitud/longitud/radioKm a un filtro de zona único', async () => {
    const { repositorioReportes } = crearFakes(paginaVacia);
    const caso = new ListarReportes(repositorioReportes);

    await caso.ejecutar({ ...parametrosBase, latitud: -37.9989, longitud: -61.3565, radioKm: 5 });

    expect(repositorioReportes.listar).toHaveBeenCalledWith(
      expect.objectContaining({ zona: { latitud: -37.9989, longitud: -61.3565, radioKm: 5 } }),
      1,
      50,
    );
  });

  it('propaga tipo y estado tal cual', async () => {
    const { repositorioReportes } = crearFakes(paginaVacia);
    const caso = new ListarReportes(repositorioReportes);

    await caso.ejecutar({ ...parametrosBase, tipo: 'perdido', estado: 'resuelto' });

    expect(repositorioReportes.listar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'perdido', estado: 'resuelto' }),
      1,
      50,
    );
  });

  it('aplica el tope de 50 por página aunque el llamador pida más (defensa en profundidad)', async () => {
    const { repositorioReportes } = crearFakes(paginaVacia);
    const caso = new ListarReportes(repositorioReportes);

    await caso.ejecutar({ ...parametrosBase, porPagina: 500 });

    expect(repositorioReportes.listar).toHaveBeenCalledWith(expect.anything(), 1, 50);
  });

  it('nunca pide una página menor a 1', async () => {
    const { repositorioReportes } = crearFakes(paginaVacia);
    const caso = new ListarReportes(repositorioReportes);

    await caso.ejecutar({ ...parametrosBase, pagina: -3 });

    expect(repositorioReportes.listar).toHaveBeenCalledWith(expect.anything(), 1, 50);
  });

  it('devuelve la página tal como la entrega el repositorio', async () => {
    const pagina: PaginaReportes = {
      items: [
        {
          id: 'reporte-1',
          tipo: 'perdido',
          subtipo: null,
          descripcion: 'Se perdió cerca de la plaza.',
          fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg',
          latitud: -37.9989,
          longitud: -61.3565,
          especie: 'perro',
          estado: 'reportado',
          createdAt: new Date('2026-08-01T12:00:00.000Z'),
        },
      ],
      total: 1,
      pagina: 1,
      porPagina: 50,
    };
    const { repositorioReportes } = crearFakes(pagina);
    const caso = new ListarReportes(repositorioReportes);

    const resultado = await caso.ejecutar(parametrosBase);

    expect(resultado).toEqual(pagina);
  });

  it('no requiere ninguna verificación de sesión ni de rol (autorizar es no-op)', async () => {
    const { repositorioReportes } = crearFakes(paginaVacia);
    const caso = new ListarReportes(repositorioReportes);

    await expect(caso.ejecutar(parametrosBase)).resolves.toEqual(paginaVacia);
  });
});
