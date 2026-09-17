/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ListarSolicitudesVeterinarias } from '@aplicacion/casos-de-uso/red-colaboracion/ListarSolicitudesVeterinarias';
import type {
  IRepositorioSolicitudesRecurso,
  PaginaSolicitudesVeterinarias,
} from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const veterinarioId = '11111111-1111-1111-1111-111111111111';

const PAGINA_VACIA: PaginaSolicitudesVeterinarias = {
  items: [],
  total: 0,
  pagina: 1,
  porPagina: 50,
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return {
    id: veterinarioId,
    email: 'vet@ejemplo.test',
    rol,
    estadoVerificacion: 'verificado',
    verificadoEn: new Date(),
  };
}

function crearFakes(opciones?: { rol?: string }) {
  const repositorioSolicitudes: jest.Mocked<IRepositorioSolicitudesRecurso> = {
    crear: jest.fn(),
    obtenerActual: jest.fn(),
    listarAsistenciaVeterinariaAbiertas: jest.fn().mockResolvedValue(PAGINA_VACIA),
    listarAbiertas: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'veterinario')),
  };
  return { repositorioSolicitudes, repositorioPerfil };
}

describe('ListarSolicitudesVeterinarias', () => {
  it('delega en el repositorio con la paginación por defecto cuando no se declara zona', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    const caso = new ListarSolicitudesVeterinarias(repositorioSolicitudes, repositorioPerfil);

    await caso.ejecutar({ datosCrudos: {}, veterinarioId });

    expect(repositorioSolicitudes.listarAsistenciaVeterinariaAbiertas).toHaveBeenCalledWith(
      undefined,
      1,
      50,
    );
  });

  it('propaga el filtro de zona completo (latitud + longitud + radioKm) al repositorio', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    const caso = new ListarSolicitudesVeterinarias(repositorioSolicitudes, repositorioPerfil);

    await caso.ejecutar({
      datosCrudos: {
        latitud: '-37.9989',
        longitud: '-61.3565',
        radioKm: '10',
        pagina: '2',
        porPagina: '20',
      },
      veterinarioId,
    });

    expect(repositorioSolicitudes.listarAsistenciaVeterinariaAbiertas).toHaveBeenCalledWith(
      { latitud: -37.9989, longitud: -61.3565, radioKm: 10 },
      2,
      20,
    );
  });

  it('rechaza un filtro de zona incompleto (ZodError, 400 en el route handler)', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    const caso = new ListarSolicitudesVeterinarias(repositorioSolicitudes, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { latitud: '-37.9989' }, veterinarioId }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repositorioSolicitudes.listarAsistenciaVeterinariaAbiertas).not.toHaveBeenCalled();
  });

  it('permite el acceso a un usuario con rol veterinario', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes({ rol: 'veterinario' });
    const caso = new ListarSolicitudesVeterinarias(repositorioSolicitudes, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: {}, veterinarioId })).resolves.toEqual(PAGINA_VACIA);
  });

  it.each(['rescatista', 'organizacion', 'dueño', 'municipio', 'administrador', 'comerciante'])(
    'rechaza con 403 / PEA-SIS-002 a un usuario con rol %s',
    async (rol) => {
      const { repositorioSolicitudes, repositorioPerfil } = crearFakes({ rol });
      const caso = new ListarSolicitudesVeterinarias(repositorioSolicitudes, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: {}, veterinarioId })).rejects.toBeInstanceOf(
        AccesoNoAutorizadoError,
      );
      expect(repositorioSolicitudes.listarAsistenciaVeterinariaAbiertas).not.toHaveBeenCalled();
    },
  );

  it('rechaza si no existe perfil para el usuario autenticado (anti-enumeración, mismo código que rol distinto)', async () => {
    const repositorioSolicitudes: jest.Mocked<IRepositorioSolicitudesRecurso> = {
      crear: jest.fn(),
      obtenerActual: jest.fn(),
      listarAsistenciaVeterinariaAbiertas: jest.fn(),
      listarAbiertas: jest.fn(),
    };
    const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
      obtenerPerfilPropio: jest.fn().mockResolvedValue(null),
    };
    const caso = new ListarSolicitudesVeterinarias(repositorioSolicitudes, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: {}, veterinarioId })).rejects.toBeInstanceOf(
      AccesoNoAutorizadoError,
    );
  });
});
