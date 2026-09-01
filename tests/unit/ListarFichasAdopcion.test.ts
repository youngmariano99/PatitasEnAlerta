/**
 * @jest-environment node
 */
import { ListarFichasAdopcion } from '@aplicacion/casos-de-uso/municipio/ListarFichasAdopcion';
import type { IRepositorioFichasAdopcion, PaginaFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';

const municipioId = '11111111-1111-1111-1111-111111111111';
const paginaVacia: PaginaFichasAdopcion = { items: [], total: 0, pagina: 1, porPagina: 50 };

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: municipioId, email: 'municipio@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string }) {
  const repositorioFichas: jest.Mocked<IRepositorioFichasAdopcion> = {
    crear: jest.fn(),
    buscarPorId: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
    listarPorMunicipio: jest.fn().mockResolvedValue(paginaVacia),
    listarPublico: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'municipio')),
  };
  return { repositorioFichas, repositorioPerfil };
}

describe('ListarFichasAdopcion', () => {
  it('delega en el repositorio con el municipioId de la sesión y los filtros/paginación normalizados', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new ListarFichasAdopcion(repositorioFichas, repositorioPerfil);

    await caso.ejecutar({ pagina: 2, porPagina: 20, estado: 'disponible', municipioId });

    expect(repositorioFichas.listarPorMunicipio).toHaveBeenCalledWith(
      { municipioId, estado: 'disponible' },
      2,
      20,
    );
  });

  it('topa porPagina en 50', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new ListarFichasAdopcion(repositorioFichas, repositorioPerfil);

    await caso.ejecutar({ pagina: 1, porPagina: 999, municipioId });

    expect(repositorioFichas.listarPorMunicipio).toHaveBeenCalledWith(expect.anything(), 1, 50);
  });

  it.each(['dueño', 'veterinario'])('rechaza con PEA-MUN-005 (403) para rol %s, sin consultar el repositorio', async (rol) => {
    const { repositorioFichas, repositorioPerfil } = crearFakes({ rol });
    const caso = new ListarFichasAdopcion(repositorioFichas, repositorioPerfil);

    await expect(caso.ejecutar({ pagina: 1, porPagina: 50, municipioId })).rejects.toBeInstanceOf(
      SoloMunicipioAdministraEventosError,
    );
    expect(repositorioFichas.listarPorMunicipio).not.toHaveBeenCalled();
  });
});
