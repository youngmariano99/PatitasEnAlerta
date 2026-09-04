/**
 * @jest-environment node
 */
import { ListarTurnosVeterinario } from '@aplicacion/casos-de-uso/veterinarios/ListarTurnosVeterinario';
import type { IRepositorioTurnos, PaginaTurnosReservadosVeterinario } from '@dominio/puertos/IRepositorioTurnos';

const veterinarioId = '22222222-2222-4222-8222-222222222222';

function crearFakes(pagina: PaginaTurnosReservadosVeterinario) {
  const repositorioTurnos: jest.Mocked<IRepositorioTurnos> = {
    contarDisponiblesPorEvento: jest.fn(),
    crearLote: jest.fn(),
    obtenerActual: jest.fn(),
    reservar: jest.fn(),
    listarPropios: jest.fn(),
    cancelar: jest.fn(),
    reprogramar: jest.fn(),
    listarFranjasExistentes: jest.fn(),
    listarReservadosPorProveedor: jest.fn().mockResolvedValue(pagina),
  };
  return { repositorioTurnos };
}

const paginaVacia: PaginaTurnosReservadosVeterinario = { items: [], total: 0, pagina: 1, porPagina: 50 };

describe('ListarTurnosVeterinario', () => {
  it('delega en el repositorio con el veterinario, pagina y porPagina dados', async () => {
    const { repositorioTurnos } = crearFakes(paginaVacia);
    const caso = new ListarTurnosVeterinario(repositorioTurnos);

    await caso.ejecutar({ veterinarioId, pagina: 1, porPagina: 50 });

    expect(repositorioTurnos.listarReservadosPorProveedor).toHaveBeenCalledWith(veterinarioId, 1, 50);
  });

  it('aplica el tope de 50 por página aunque el llamador pida más (defensa en profundidad)', async () => {
    const { repositorioTurnos } = crearFakes(paginaVacia);
    const caso = new ListarTurnosVeterinario(repositorioTurnos);

    await caso.ejecutar({ veterinarioId, pagina: 1, porPagina: 500 });

    expect(repositorioTurnos.listarReservadosPorProveedor).toHaveBeenCalledWith(veterinarioId, 1, 50);
  });

  it('nunca pide una página menor a 1', async () => {
    const { repositorioTurnos } = crearFakes(paginaVacia);
    const caso = new ListarTurnosVeterinario(repositorioTurnos);

    await caso.ejecutar({ veterinarioId, pagina: -3, porPagina: 50 });

    expect(repositorioTurnos.listarReservadosPorProveedor).toHaveBeenCalledWith(veterinarioId, 1, 50);
  });

  it('devuelve la página tal como la entrega el repositorio', async () => {
    const pagina: PaginaTurnosReservadosVeterinario = {
      items: [
        {
          id: 'turno-1',
          franjaInicio: new Date('2026-09-05T13:00:00.000Z'),
          franjaFin: new Date('2026-09-05T13:20:00.000Z'),
          reservadoPorEmail: 'dueno@example.com',
        },
      ],
      total: 1,
      pagina: 1,
      porPagina: 50,
    };
    const { repositorioTurnos } = crearFakes(pagina);
    const caso = new ListarTurnosVeterinario(repositorioTurnos);

    const resultado = await caso.ejecutar({ veterinarioId, pagina: 1, porPagina: 50 });

    expect(resultado).toEqual(pagina);
  });

  it('AC (verificación técnica): no requiere ninguna verificación adicional — la pertenencia la impone el repositorio, no un chequeo de rol', async () => {
    const { repositorioTurnos } = crearFakes(paginaVacia);
    const caso = new ListarTurnosVeterinario(repositorioTurnos);

    await expect(caso.ejecutar({ veterinarioId, pagina: 1, porPagina: 50 })).resolves.toEqual(paginaVacia);
  });
});
