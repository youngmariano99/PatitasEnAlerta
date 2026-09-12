/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { BuscarReportesSimilares } from '@aplicacion/casos-de-uso/red-colaboracion/BuscarReportesSimilares';
import type { CriteriosBusquedaSemantica, IRepositorioReportes, ReporteSimilar } from '@dominio/puertos/IRepositorioReportes';
import type { IGeneradorEmbeddings } from '@dominio/puertos/IGeneradorEmbeddings';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError, ServicioExternoNoDisponibleError } from '@dominio/errores/erroresTransversales';

const usuarioSolicitanteId = '11111111-1111-1111-1111-111111111111';
const vectorDeEjemplo = Array.from({ length: 1536 }, () => 0.001);

const reporteDeEjemplo: ReporteSimilar = {
  id: 'reporte-1',
  tipo: 'perdido',
  subtipo: null,
  descripcion: 'Gato asustadizo con otros perros',
  fotoUrl: 'https://res.cloudinary.com/demo/image/upload/gato.jpg',
  latitud: -37.9989,
  longitud: -61.3565,
  especie: 'gato',
  estado: 'reportado',
  createdAt: new Date('2026-09-10T09:00:00.000Z'),
  similitud: 0.87,
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: usuarioSolicitanteId, email: 'solicitante@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string }) {
  const repositorioReportes: jest.Mocked<IRepositorioReportes> = {
    crear: jest.fn(),
    buscarPerdidosActivosPorZonaYEspecie: jest.fn(),
    listar: jest.fn(),
    obtenerEstadoActual: jest.fn(),
    actualizarEstado: jest.fn(),
    obtenerPropietario: jest.fn(),
    listarHistorialEstado: jest.fn(),
    buscarPorSimilitudSemantica: jest.fn().mockResolvedValue([reporteDeEjemplo]),
  };
  const generadorEmbeddings: jest.Mocked<IGeneradorEmbeddings> = {
    generarEmbedding: jest.fn().mockResolvedValue(vectorDeEjemplo),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'organizacion')),
  };
  return { repositorioReportes, generadorEmbeddings, repositorioPerfil };
}

describe('BuscarReportesSimilares', () => {
  it('genera el embedding de la consulta y delega la búsqueda híbrida en el repositorio', async () => {
    const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes();
    const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

    const resultado = await caso.ejecutar({
      datosCrudos: { consulta: 'gato asustadizo con otros perros' },
      usuarioSolicitanteId,
    });

    expect(generadorEmbeddings.generarEmbedding).toHaveBeenCalledWith('gato asustadizo con otros perros');
    expect(repositorioReportes.buscarPorSimilitudSemantica).toHaveBeenCalledWith({
      vectorConsulta: vectorDeEjemplo,
      tipo: undefined,
      estado: undefined,
      especie: undefined,
      zona: undefined,
      limite: 20,
    });
    expect(resultado).toEqual([reporteDeEjemplo]);
  });

  it('propaga los filtros exactos combinables (tipo/estado/especie) al repositorio', async () => {
    const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes();
    const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

    await caso.ejecutar({
      datosCrudos: { consulta: 'foco sanitario en el barrio', tipo: 'problematica', estado: 'en_revision', especie: 'perro' },
      usuarioSolicitanteId,
    });

    const criteriosRecibidos = repositorioReportes.buscarPorSimilitudSemantica.mock.calls[0]?.[0] as CriteriosBusquedaSemantica;
    expect(criteriosRecibidos.tipo).toBe('problematica');
    expect(criteriosRecibidos.estado).toBe('en_revision');
    expect(criteriosRecibidos.especie).toBe('perro');
  });

  it('arma el filtro de zona únicamente cuando llegan los tres campos juntos', async () => {
    const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes();
    const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

    await caso.ejecutar({
      datosCrudos: { consulta: 'gato perdido cerca de la plaza', latitud: '-37.9989', longitud: '-61.3565', radioKm: '10' },
      usuarioSolicitanteId,
    });

    const criteriosRecibidos = repositorioReportes.buscarPorSimilitudSemantica.mock.calls[0]?.[0] as CriteriosBusquedaSemantica;
    expect(criteriosRecibidos.zona).toEqual({ latitud: -37.9989, longitud: -61.3565, radioKm: 10 });
  });

  it('rechaza fail-fast (Zod) un filtro de zona incompleto, sin generar embedding', async () => {
    const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes();
    const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { consulta: 'gato perdido', latitud: '-37.9989' }, usuarioSolicitanteId }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(generadorEmbeddings.generarEmbedding).not.toHaveBeenCalled();
    expect(repositorioReportes.buscarPorSimilitudSemantica).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) una consulta ausente o demasiado corta', async () => {
    const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes();
    const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: {}, usuarioSolicitanteId })).rejects.toBeInstanceOf(ZodError);
    await expect(
      caso.ejecutar({ datosCrudos: { consulta: 'ga' }, usuarioSolicitanteId }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repositorioReportes.buscarPorSimilitudSemantica).not.toHaveBeenCalled();
  });

  it('aplica el tope de 20 resultados aunque se pida más', async () => {
    const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes();
    const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

    await caso.ejecutar({ datosCrudos: { consulta: 'gato perdido', limite: '999' }, usuarioSolicitanteId });

    expect(repositorioReportes.buscarPorSimilitudSemantica).toHaveBeenCalledWith(
      expect.objectContaining({ limite: 20 }),
    );
  });

  it.each(['organizacion', 'veterinario', 'rescatista', 'municipio', 'administrador'])(
    'permite el acceso a un solicitante con rol %s',
    async (rol) => {
      const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes({ rol });
      const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

      await expect(
        caso.ejecutar({ datosCrudos: { consulta: 'gato perdido' }, usuarioSolicitanteId }),
      ).resolves.toEqual([reporteDeEjemplo]);
    },
  );

  it.each(['dueño', 'comerciante'])(
    'rechaza con AccesoNoAutorizadoError (PEA-SIS-002) para rol %s, sin generar embedding',
    async (rol) => {
      const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes({ rol });
      const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

      await expect(
        caso.ejecutar({ datosCrudos: { consulta: 'gato perdido' }, usuarioSolicitanteId }),
      ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
      expect(generadorEmbeddings.generarEmbedding).not.toHaveBeenCalled();
      expect(repositorioReportes.buscarPorSimilitudSemantica).not.toHaveBeenCalled();
    },
  );

  it('rechaza cuando no existe perfil para el usuarioSolicitanteId (anti-IDOR)', async () => {
    const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes();
    repositorioPerfil.obtenerPerfilPropio.mockResolvedValue(null);
    const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { consulta: 'gato perdido' }, usuarioSolicitanteId }),
    ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioReportes.buscarPorSimilitudSemantica).not.toHaveBeenCalled();
  });

  it('propaga ServicioExternoNoDisponibleError (PEA-SIS-004) si el proveedor de embeddings falla', async () => {
    const { repositorioReportes, generadorEmbeddings, repositorioPerfil } = crearFakes();
    generadorEmbeddings.generarEmbedding.mockRejectedValue(new ServicioExternoNoDisponibleError());
    const caso = new BuscarReportesSimilares(repositorioReportes, generadorEmbeddings, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { consulta: 'gato perdido' }, usuarioSolicitanteId }),
    ).rejects.toBeInstanceOf(ServicioExternoNoDisponibleError);
    expect(repositorioReportes.buscarPorSimilitudSemantica).not.toHaveBeenCalled();
  });
});
