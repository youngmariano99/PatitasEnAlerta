/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ActualizarFichaAdopcion } from '@aplicacion/casos-de-uso/municipio/ActualizarFichaAdopcion';
import { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';
import type { CambiosFichaAdopcion, IRepositorioFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { FichaAdopcionNoEncontradaError, SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';

const municipioId = '11111111-1111-1111-1111-111111111111';
const fichaId = '22222222-2222-2222-2222-222222222222';

const fichaExistente = FichaAdopcion.reconstruir(
  fichaId,
  {
    municipioId,
    nombreAnimal: 'Luna',
    especie: 'perro',
    edadAproximada: null,
    tamano: null,
    temperamento: null,
    estadoSalud: null,
    requisitosAdopcion: null,
    fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/luna.jpg',
    estado: 'disponible',
  },
  new Date('2026-09-01T09:00:00.000Z'),
);

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: municipioId, email: 'municipio@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string; fichaExistenteOverride?: FichaAdopcion | null }) {
  const repositorioFichas: jest.Mocked<IRepositorioFichasAdopcion> = {
    crear: jest.fn(),
    buscarPorId: jest
      .fn()
      .mockResolvedValue(opciones && 'fichaExistenteOverride' in opciones ? opciones.fichaExistenteOverride : fichaExistente),
    actualizar: jest.fn().mockImplementation(async (id: string, cambios: CambiosFichaAdopcion) =>
      FichaAdopcion.reconstruir(
        id,
        {
          municipioId,
          nombreAnimal: cambios.nombreAnimal ?? fichaExistente.nombreAnimal,
          especie: cambios.especie ?? fichaExistente.especie,
          edadAproximada: cambios.edadAproximada ?? fichaExistente.edadAproximada,
          tamano: cambios.tamano ?? fichaExistente.tamano,
          temperamento: cambios.temperamento ?? fichaExistente.temperamento,
          estadoSalud: cambios.estadoSalud ?? fichaExistente.estadoSalud,
          requisitosAdopcion: cambios.requisitosAdopcion ?? fichaExistente.requisitosAdopcion,
          fotoUrl: cambios.fotoUrl ?? fichaExistente.fotoUrl,
          estado: fichaExistente.estado,
        },
        fichaExistente.createdAt,
      ),
    ),
    darDeBaja: jest.fn(),
    listarPorMunicipio: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'municipio')),
  };
  return { repositorioFichas, repositorioPerfil };
}

describe('ActualizarFichaAdopcion', () => {
  it('actualiza solo los campos provistos', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new ActualizarFichaAdopcion(repositorioFichas, repositorioPerfil);

    const resultado = await caso.ejecutar({ id: fichaId, datosCrudos: { temperamento: 'Muy juguetón' }, municipioId });

    expect(resultado.temperamento).toBe('Muy juguetón');
    expect(resultado.nombreAnimal).toBe('Luna');
    expect(repositorioFichas.actualizar).toHaveBeenCalledWith(fichaId, { temperamento: 'Muy juguetón' });
  });

  it('nunca envía id/municipioId como parte de los "cambios" al repositorio', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new ActualizarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await caso.ejecutar({ id: fichaId, datosCrudos: { nombreAnimal: 'Luna II' }, municipioId });

    const [, cambiosEnviados] = repositorioFichas.actualizar.mock.calls[0]!;
    expect(cambiosEnviados).not.toHaveProperty('id');
    expect(cambiosEnviados).not.toHaveProperty('municipioId');
  });

  it('permite la edición también para rol administrador', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes({ rol: 'administrador' });
    const caso = new ActualizarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(
      caso.ejecutar({ id: fichaId, datosCrudos: { especie: 'gato' }, municipioId }),
    ).resolves.toMatchObject({ especie: 'gato' });
  });

  it.each(['dueño', 'veterinario'])('rechaza con PEA-MUN-005 (403) para rol %s, sin tocar el repositorio', async (rol) => {
    const { repositorioFichas, repositorioPerfil } = crearFakes({ rol });
    const caso = new ActualizarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(
      caso.ejecutar({ id: fichaId, datosCrudos: { nombreAnimal: 'Luna II' }, municipioId }),
    ).rejects.toBeInstanceOf(SoloMunicipioAdministraEventosError);
    expect(repositorioFichas.buscarPorId).not.toHaveBeenCalled();
    expect(repositorioFichas.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-MUN-008 (404) si la ficha no existe o está soft-deleted', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes({ fichaExistenteOverride: null });
    const caso = new ActualizarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(
      caso.ejecutar({ id: fichaId, datosCrudos: { nombreAnimal: 'Luna II' }, municipioId }),
    ).rejects.toBeInstanceOf(FichaAdopcionNoEncontradaError);
    expect(repositorioFichas.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast si el body no declara ningún campo para actualizar', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new ActualizarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(caso.ejecutar({ id: fichaId, datosCrudos: {}, municipioId })).rejects.toBeInstanceOf(PayloadInvalidoError);
    expect(repositorioFichas.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) una fotoUrl inválida', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new ActualizarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(
      caso.ejecutar({ id: fichaId, datosCrudos: { fotoUrl: 'no-es-una-url' }, municipioId }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
