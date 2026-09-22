/**
 * @jest-environment node
 */
import { ListarCursos } from '@aplicacion/casos-de-uso/foros-cursos/ListarCursos';
import type { IRepositorioCursos, PaginaCursos } from '@dominio/puertos/IRepositorioCursos';

const paginaVacia: PaginaCursos = { items: [], total: 0, pagina: 1, porPagina: 50 };

describe('ListarCursos', () => {
  it('delega en el repositorio con la paginación clampeada', async () => {
    const repositorioCursos: jest.Mocked<IRepositorioCursos> = {
      crear: jest.fn(),
      listar: jest.fn().mockResolvedValue(paginaVacia),
    };
    const caso = new ListarCursos(repositorioCursos);

    await caso.ejecutar({ datosCrudos: { pagina: 2, porPagina: 20 } });

    expect(repositorioCursos.listar).toHaveBeenCalledWith(2, 20);
  });

  it('clampea porPagina al tope de 50', async () => {
    const repositorioCursos: jest.Mocked<IRepositorioCursos> = {
      crear: jest.fn(),
      listar: jest.fn().mockResolvedValue(paginaVacia),
    };
    const caso = new ListarCursos(repositorioCursos);

    await caso.ejecutar({ datosCrudos: { pagina: 1, porPagina: 500 } });

    expect(repositorioCursos.listar).toHaveBeenCalledWith(1, 50);
  });
});
