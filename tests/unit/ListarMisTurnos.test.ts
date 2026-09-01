/**
 * @jest-environment node
 */
import { ListarMisTurnos } from '@aplicacion/casos-de-uso/turnos/ListarMisTurnos';
import type { IRepositorioTurnos, PaginaTurnosPropios } from '@dominio/puertos/IRepositorioTurnos';

const solicitanteId = '11111111-1111-4111-8111-111111111111';

function crearFakes(pagina: PaginaTurnosPropios) {
  const repositorioTurnos: jest.Mocked<IRepositorioTurnos> = {
    contarDisponiblesPorEvento: jest.fn(),
    crearLote: jest.fn(),
    obtenerActual: jest.fn(),
    reservar: jest.fn(),
    listarPropios: jest.fn().mockResolvedValue(pagina),
  };
  return { repositorioTurnos };
}

const paginaVacia: PaginaTurnosPropios = { items: [], total: 0, pagina: 1, porPagina: 50 };

describe('ListarMisTurnos', () => {
  it('delega en el repositorio con el solicitante, pagina y porPagina dados', async () => {
    const { repositorioTurnos } = crearFakes(paginaVacia);
    const caso = new ListarMisTurnos(repositorioTurnos);

    await caso.ejecutar({ solicitanteId, pagina: 1, porPagina: 50 });

    expect(repositorioTurnos.listarPropios).toHaveBeenCalledWith(solicitanteId, 1, 50);
  });

  it('aplica el tope de 50 por página aunque el llamador pida más (defensa en profundidad)', async () => {
    const { repositorioTurnos } = crearFakes(paginaVacia);
    const caso = new ListarMisTurnos(repositorioTurnos);

    await caso.ejecutar({ solicitanteId, pagina: 1, porPagina: 500 });

    expect(repositorioTurnos.listarPropios).toHaveBeenCalledWith(solicitanteId, 1, 50);
  });

  it('nunca pide una página menor a 1', async () => {
    const { repositorioTurnos } = crearFakes(paginaVacia);
    const caso = new ListarMisTurnos(repositorioTurnos);

    await caso.ejecutar({ solicitanteId, pagina: -3, porPagina: 50 });

    expect(repositorioTurnos.listarPropios).toHaveBeenCalledWith(solicitanteId, 1, 50);
  });

  it('devuelve la página tal como la entrega el repositorio', async () => {
    const pagina: PaginaTurnosPropios = {
      items: [
        {
          id: 'turno-1',
          proveedorTipo: 'municipio',
          proveedorId: 'municipio-1',
          eventoId: 'evento-1',
          eventoTitulo: 'Jornada de castración — Barrio Norte',
          franjaInicio: new Date('2026-09-05T13:00:00.000Z'),
          franjaFin: new Date('2026-09-05T13:20:00.000Z'),
          estado: 'reservado',
        },
      ],
      total: 1,
      pagina: 1,
      porPagina: 50,
    };
    const { repositorioTurnos } = crearFakes(pagina);
    const caso = new ListarMisTurnos(repositorioTurnos);

    const resultado = await caso.ejecutar({ solicitanteId, pagina: 1, porPagina: 50 });

    expect(resultado).toEqual(pagina);
  });

  it('AC (verificación técnica): no requiere ninguna verificación adicional — la pertenencia la impone el repositorio, no un chequeo de rol', async () => {
    const { repositorioTurnos } = crearFakes(paginaVacia);
    const caso = new ListarMisTurnos(repositorioTurnos);

    await expect(caso.ejecutar({ solicitanteId, pagina: 1, porPagina: 50 })).resolves.toEqual(paginaVacia);
  });
});
