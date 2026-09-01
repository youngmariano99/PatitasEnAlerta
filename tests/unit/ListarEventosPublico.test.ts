/**
 * @jest-environment node
 */
import { ListarEventosPublico } from '@aplicacion/casos-de-uso/municipio/ListarEventosPublico';
import type { IRepositorioEventos, PaginaEventos } from '@dominio/puertos/IRepositorioEventos';
import type { ParametrosListarEventosPublico } from '@aplicacion/dtos/municipio/ListarEventosPublicoDto';

function crearFakes(pagina: PaginaEventos) {
  const repositorioEventos: jest.Mocked<IRepositorioEventos> = {
    crear: jest.fn(),
    listar: jest.fn().mockResolvedValue(pagina),
  };
  return { repositorioEventos };
}

const paginaVacia: PaginaEventos = { items: [], total: 0, pagina: 1, porPagina: 50 };

const parametrosBase: ParametrosListarEventosPublico = {
  pagina: 1,
  porPagina: 50,
  tipo: undefined,
  fechaDesde: undefined,
  fechaHasta: undefined,
};

describe('ListarEventosPublico', () => {
  it('delega en el repositorio sin filtros cuando no se declaran', async () => {
    const { repositorioEventos } = crearFakes(paginaVacia);
    const caso = new ListarEventosPublico(repositorioEventos);

    await caso.ejecutar(parametrosBase);

    expect(repositorioEventos.listar).toHaveBeenCalledWith(
      { tipo: undefined, fechaDesde: undefined, fechaHasta: undefined },
      1,
      50,
    );
  });

  it('propaga tipo y rango de fechas tal cual', async () => {
    const { repositorioEventos } = crearFakes(paginaVacia);
    const caso = new ListarEventosPublico(repositorioEventos);
    const fechaDesde = new Date('2026-08-01T00:00:00.000Z');
    const fechaHasta = new Date('2026-08-31T00:00:00.000Z');

    await caso.ejecutar({ ...parametrosBase, tipo: 'vacunacion', fechaDesde, fechaHasta });

    expect(repositorioEventos.listar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'vacunacion', fechaDesde, fechaHasta }),
      1,
      50,
    );
  });

  it('aplica el tope de 50 por página aunque el llamador pida más (defensa en profundidad, Paso 3)', async () => {
    const { repositorioEventos } = crearFakes(paginaVacia);
    const caso = new ListarEventosPublico(repositorioEventos);

    await caso.ejecutar({ ...parametrosBase, porPagina: 500 });

    expect(repositorioEventos.listar).toHaveBeenCalledWith(expect.anything(), 1, 50);
  });

  it('nunca pide una página menor a 1', async () => {
    const { repositorioEventos } = crearFakes(paginaVacia);
    const caso = new ListarEventosPublico(repositorioEventos);

    await caso.ejecutar({ ...parametrosBase, pagina: -3 });

    expect(repositorioEventos.listar).toHaveBeenCalledWith(expect.anything(), 1, 50);
  });

  it('devuelve la página tal como la entrega el repositorio', async () => {
    const pagina: PaginaEventos = {
      items: [
        {
          id: 'evento-1',
          municipioId: 'municipio-1',
          titulo: 'Jornada de castración — Barrio Norte',
          tipo: 'castracion',
          direccion: 'Calle 50 N° 123',
          latitud: -37.9989,
          longitud: -61.3565,
          fecha: new Date('2026-09-05T13:00:00.000Z'),
          cuposTotales: 30,
          requisitos: 'Traer a la mascota con collar/bozal y DNI del tutor.',
        },
      ],
      total: 1,
      pagina: 1,
      porPagina: 50,
    };
    const { repositorioEventos } = crearFakes(pagina);
    const caso = new ListarEventosPublico(repositorioEventos);

    const resultado = await caso.ejecutar(parametrosBase);

    expect(resultado).toEqual(pagina);
  });

  it('AC: no requiere ninguna verificación de sesión ni de rol (autorizar es no-op — acceso anónimo)', async () => {
    const { repositorioEventos } = crearFakes(paginaVacia);
    const caso = new ListarEventosPublico(repositorioEventos);

    await expect(caso.ejecutar(parametrosBase)).resolves.toEqual(paginaVacia);
  });
});
