/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ListarDirectorioAliados } from '@aplicacion/casos-de-uso/red-colaboracion/ListarDirectorioAliados';
import type {
  FiltrosDirectorioAliados,
  IRepositorioDirectorioAliados,
  PaginaDirectorioAliados,
} from '@dominio/puertos/IRepositorioDirectorioAliados';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const usuarioSolicitanteId = '11111111-1111-1111-1111-111111111111';

const paginaVacia: PaginaDirectorioAliados = { items: [], total: 0, pagina: 1, porPagina: 50 };

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: usuarioSolicitanteId, email: 'solicitante@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string }) {
  const repositorioDirectorio: jest.Mocked<IRepositorioDirectorioAliados> = {
    listar: jest.fn().mockResolvedValue(paginaVacia),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'organizacion')),
  };
  return { repositorioDirectorio, repositorioPerfil };
}

describe('ListarDirectorioAliados', () => {
  it('delega el listado paginado en el repositorio con los valores por defecto', async () => {
    const { repositorioDirectorio, repositorioPerfil } = crearFakes();
    const caso = new ListarDirectorioAliados(repositorioDirectorio, repositorioPerfil);

    await caso.ejecutar({ datosCrudos: {}, usuarioSolicitanteId });

    expect(repositorioDirectorio.listar).toHaveBeenCalledWith(
      { rol: undefined, zona: undefined },
      1,
      50,
    );
  });

  it('propaga el filtro de rol al repositorio', async () => {
    const { repositorioDirectorio, repositorioPerfil } = crearFakes();
    const caso = new ListarDirectorioAliados(repositorioDirectorio, repositorioPerfil);

    await caso.ejecutar({ datosCrudos: { rol: 'veterinario' }, usuarioSolicitanteId });

    expect(repositorioDirectorio.listar).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'veterinario' }),
      1,
      50,
    );
  });

  it('arma el filtro de zona únicamente cuando llegan los tres campos juntos', async () => {
    const { repositorioDirectorio, repositorioPerfil } = crearFakes();
    const caso = new ListarDirectorioAliados(repositorioDirectorio, repositorioPerfil);

    await caso.ejecutar({
      datosCrudos: { latitud: '-37.9989', longitud: '-61.3565', radioKm: '10' },
      usuarioSolicitanteId,
    });

    const filtrosRecibidos = repositorioDirectorio.listar.mock.calls[0]?.[0] as FiltrosDirectorioAliados;
    expect(filtrosRecibidos.zona).toEqual({ latitud: -37.9989, longitud: -61.3565, radioKm: 10 });
  });

  it('rechaza fail-fast (Zod) un filtro de zona incompleto', async () => {
    const { repositorioDirectorio, repositorioPerfil } = crearFakes();
    const caso = new ListarDirectorioAliados(repositorioDirectorio, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { latitud: '-37.9989' }, usuarioSolicitanteId }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repositorioDirectorio.listar).not.toHaveBeenCalled();
  });

  it.each(['organizacion', 'veterinario', 'rescatista', 'municipio', 'administrador'])(
    'permite el acceso a un solicitante con rol %s',
    async (rol) => {
      const { repositorioDirectorio, repositorioPerfil } = crearFakes({ rol });
      const caso = new ListarDirectorioAliados(repositorioDirectorio, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: {}, usuarioSolicitanteId })).resolves.toEqual(paginaVacia);
    },
  );

  it.each(['dueño', 'comerciante'])(
    'rechaza con AccesoNoAutorizadoError (PEA-SIS-002) para rol %s, sin consultar el repositorio',
    async (rol) => {
      const { repositorioDirectorio, repositorioPerfil } = crearFakes({ rol });
      const caso = new ListarDirectorioAliados(repositorioDirectorio, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: {}, usuarioSolicitanteId })).rejects.toBeInstanceOf(
        AccesoNoAutorizadoError,
      );
      expect(repositorioDirectorio.listar).not.toHaveBeenCalled();
    },
  );

  it('rechaza cuando no existe perfil para el usuarioSolicitanteId (anti-IDOR)', async () => {
    const { repositorioDirectorio, repositorioPerfil } = crearFakes();
    repositorioPerfil.obtenerPerfilPropio.mockResolvedValue(null);
    const caso = new ListarDirectorioAliados(repositorioDirectorio, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: {}, usuarioSolicitanteId })).rejects.toBeInstanceOf(
      AccesoNoAutorizadoError,
    );
    expect(repositorioDirectorio.listar).not.toHaveBeenCalled();
  });

  it('aplica el tope de 50 por página aunque se pida más', async () => {
    const { repositorioDirectorio, repositorioPerfil } = crearFakes();
    const caso = new ListarDirectorioAliados(repositorioDirectorio, repositorioPerfil);

    await caso.ejecutar({ datosCrudos: { porPagina: '999' }, usuarioSolicitanteId });

    expect(repositorioDirectorio.listar).toHaveBeenCalledWith(expect.anything(), 1, 50);
  });
});
