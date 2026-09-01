/**
 * @jest-environment node
 */
import { DarDeBajaFichaAdopcion } from '@aplicacion/casos-de-uso/municipio/DarDeBajaFichaAdopcion';
import { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';
import type { IRepositorioFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { FichaAdopcionNoEncontradaError, SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';

const municipioId = '11111111-1111-1111-1111-111111111111';
const fichaId = '22222222-2222-2222-2222-222222222222';

const DATOS_BASE = {
  municipioId,
  nombreAnimal: 'Luna',
  especie: 'perro',
  edadAproximada: null,
  tamano: null,
  temperamento: null,
  estadoSalud: null,
  requisitosAdopcion: null,
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/luna.jpg',
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: municipioId, email: 'municipio@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string; existente?: FichaAdopcion | null; estadoActual?: string }) {
  const fichaExistente =
    opciones && 'existente' in opciones
      ? opciones.existente
      : FichaAdopcion.reconstruir(
          fichaId,
          { ...DATOS_BASE, estado: opciones?.estadoActual ?? 'disponible' },
          new Date('2026-09-01T09:00:00.000Z'),
        );

  const repositorioFichas: jest.Mocked<IRepositorioFichasAdopcion> = {
    crear: jest.fn(),
    buscarPorId: jest.fn().mockResolvedValue(fichaExistente),
    actualizar: jest.fn(),
    darDeBaja: jest.fn().mockImplementation(async (id: string) =>
      FichaAdopcion.reconstruir(id, { ...DATOS_BASE, estado: 'baja' }, new Date('2026-09-01T09:00:00.000Z')),
    ),
    listarPorMunicipio: jest.fn(),
    listarPublico: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'municipio')),
  };
  return { repositorioFichas, repositorioPerfil };
}

describe('DarDeBajaFichaAdopcion', () => {
  it('AC: mueve el estado a "baja" (soft) — nunca elimina la fila', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new DarDeBajaFichaAdopcion(repositorioFichas, repositorioPerfil);

    const resultado = await caso.ejecutar({ id: fichaId, municipioId });

    expect(resultado.estado).toBe('baja');
    expect(resultado.id).toBe(fichaId);
    expect(repositorioFichas.darDeBaja).toHaveBeenCalledWith(fichaId);
    // El puerto ni siquiera expone un método de borrado físico — la única
    // superficie de escritura para la baja es `darDeBaja` (UPDATE estado).
  });

  it('permite la baja también para rol administrador', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes({ rol: 'administrador' });
    const caso = new DarDeBajaFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(caso.ejecutar({ id: fichaId, municipioId })).resolves.toMatchObject({ estado: 'baja' });
  });

  it.each(['dueño', 'veterinario'])('rechaza con PEA-MUN-005 (403) para rol %s, sin tocar el repositorio', async (rol) => {
    const { repositorioFichas, repositorioPerfil } = crearFakes({ rol });
    const caso = new DarDeBajaFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(caso.ejecutar({ id: fichaId, municipioId })).rejects.toBeInstanceOf(SoloMunicipioAdministraEventosError);
    expect(repositorioFichas.buscarPorId).not.toHaveBeenCalled();
    expect(repositorioFichas.darDeBaja).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-MUN-008 (404) si la ficha no existe o está soft-deleted', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes({ existente: null });
    const caso = new DarDeBajaFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(caso.ejecutar({ id: fichaId, municipioId })).rejects.toBeInstanceOf(FichaAdopcionNoEncontradaError);
    expect(repositorioFichas.darDeBaja).not.toHaveBeenCalled();
  });
});
