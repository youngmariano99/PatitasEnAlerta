/**
 * @jest-environment node
 */
import { ModerarTemaCommand } from '@aplicacion/casos-de-uso/foros-cursos/ModerarTemaCommand';
import type { IRepositorioTemasForo } from '@dominio/puertos/IRepositorioTemasForo';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { TemaForoNoEncontradoError } from '@dominio/errores/erroresForosCursos';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const temaId = '33333333-3333-3333-3333-333333333333';

function crearPerfil(rol: string): ResumenPerfilPropio {
  return {
    id: usuarioId,
    email: 'admin@ejemplo.test',
    rol,
    estadoVerificacion: 'no_requerido',
    verificadoEn: null,
  };
}

function crearFakes(opciones?: { rol?: string; moderaOk?: boolean }) {
  const repositorioTemas: jest.Mocked<IRepositorioTemasForo> = {
    crear: jest.fn(),
    obtenerActual: jest.fn(),
    actualizar: jest.fn(),
    moderar: jest.fn().mockResolvedValue(opciones?.moderaOk ?? true),
    listar: jest.fn(),
    listarRespuestas: jest.fn(),
    crearRespuesta: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'administrador')),
  };
  return { repositorioTemas, repositorioPerfil };
}

describe('ModerarTemaCommand', () => {
  it('Paso 2: modera (soft delete) el tema cuando quien invoca tiene rol administrador', async () => {
    const { repositorioTemas, repositorioPerfil } = crearFakes();
    const caso = new ModerarTemaCommand(repositorioTemas, repositorioPerfil);

    const resultado = await caso.ejecutar({ temaId, usuarioId });

    expect(resultado).toEqual({ id: temaId });
    expect(repositorioTemas.moderar).toHaveBeenCalledWith(temaId);
  });

  it.each(['dueño', 'veterinario', 'municipio', 'organizacion', 'rescatista', 'comerciante'])(
    'AC: rechaza con 403 / PEA-SIS-002 a un usuario con rol %s',
    async (rol) => {
      const { repositorioTemas, repositorioPerfil } = crearFakes({ rol });
      const caso = new ModerarTemaCommand(repositorioTemas, repositorioPerfil);

      await expect(caso.ejecutar({ temaId, usuarioId })).rejects.toBeInstanceOf(
        AccesoNoAutorizadoError,
      );
      expect(repositorioTemas.moderar).not.toHaveBeenCalled();
    },
  );

  it('responde 404 / PEA-FORO-002 si el tema no existe o ya estaba moderado', async () => {
    const { repositorioTemas, repositorioPerfil } = crearFakes({ moderaOk: false });
    const caso = new ModerarTemaCommand(repositorioTemas, repositorioPerfil);

    await expect(caso.ejecutar({ temaId, usuarioId })).rejects.toBeInstanceOf(
      TemaForoNoEncontradoError,
    );
  });
});
