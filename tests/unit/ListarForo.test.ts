/**
 * @jest-environment node
 */
import { ListarForo } from '@aplicacion/casos-de-uso/foros-cursos/ListarForo';
import type {
  IRepositorioTemasForo,
  PaginaTemasForo,
} from '@dominio/puertos/IRepositorioTemasForo';

function crearFakes() {
  const pagina: PaginaTemasForo = { items: [], total: 0, pagina: 1, porPagina: 50 };
  const repositorioTemas: jest.Mocked<IRepositorioTemasForo> = {
    crear: jest.fn(),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    moderar: jest.fn(),
    listar: jest.fn().mockResolvedValue(pagina),
    listarRespuestas: jest.fn(),
    crearRespuesta: jest.fn(),
  };
  return { repositorioTemas };
}

describe('ListarForo', () => {
  it('Paso 1: delega en el repositorio con la página y el tope por defecto (50)', async () => {
    const { repositorioTemas } = crearFakes();
    const caso = new ListarForo(repositorioTemas);

    await caso.ejecutar({ datosCrudos: {} });

    expect(repositorioTemas.listar).toHaveBeenCalledWith(1, 50);
  });

  it('respeta pagina/porPagina explícitos dentro del tope', async () => {
    const { repositorioTemas } = crearFakes();
    const caso = new ListarForo(repositorioTemas);

    await caso.ejecutar({ datosCrudos: { pagina: '3', porPagina: '10' } });

    expect(repositorioTemas.listar).toHaveBeenCalledWith(3, 10);
  });

  it('AC / Paso 4: clampea porPagina al tope de 50 aunque se pida más', async () => {
    const { repositorioTemas } = crearFakes();
    const caso = new ListarForo(repositorioTemas);

    await caso.ejecutar({ datosCrudos: { porPagina: '200' } });

    expect(repositorioTemas.listar).toHaveBeenCalledWith(1, 50);
  });

  it('devuelve la página tal como la entrega el repositorio', async () => {
    const { repositorioTemas } = crearFakes();
    const paginaConDatos: PaginaTemasForo = {
      items: [
        {
          id: 'tema-1',
          creadoPor: 'user-1',
          titulo: 'Título',
          contenido: 'Contenido',
          createdAt: new Date('2026-09-15T10:00:00.000Z'),
        },
      ],
      total: 1,
      pagina: 1,
      porPagina: 50,
    };
    repositorioTemas.listar.mockResolvedValue(paginaConDatos);
    const caso = new ListarForo(repositorioTemas);

    const resultado = await caso.ejecutar({ datosCrudos: {} });

    expect(resultado).toEqual(paginaConDatos);
  });

  it('Paso 3: cero temas devuelve items vacío y total 0 (soporta el estado vacío del cliente)', async () => {
    const { repositorioTemas } = crearFakes();
    const caso = new ListarForo(repositorioTemas);

    const resultado = await caso.ejecutar({ datosCrudos: {} });

    expect(resultado.items).toEqual([]);
    expect(resultado.total).toBe(0);
  });
});
