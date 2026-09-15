/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { PublicarFichaAdopcion } from '@aplicacion/casos-de-uso/municipio/PublicarFichaAdopcion';
import { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';
import type { DatosNuevaFichaAdopcion, IRepositorioFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { SoloMunicipioUOrganizacionPublicaFichaError } from '@dominio/errores/erroresMunicipio';

const municipioId = '11111111-1111-1111-1111-111111111111';

const datosCrudosValidos = {
  nombreAnimal: 'Luna',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/luna.jpg',
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: municipioId, email: 'municipio@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string }) {
  const repositorioFichas: jest.Mocked<IRepositorioFichasAdopcion> = {
    crear: jest.fn().mockImplementation(async (datos: DatosNuevaFichaAdopcion) =>
      FichaAdopcion.reconstruir('ficha-1', { ...datos, estado: 'disponible' }, new Date('2026-09-01T09:00:00.000Z')),
    ),
    buscarPorId: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
    listarPorMunicipio: jest.fn(),
    listarPublico: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'municipio')),
  };
  return { repositorioFichas, repositorioPerfil };
}

describe('PublicarFichaAdopcion', () => {
  it('publica la ficha con estado inicial "disponible" y municipioId resuelto por la sesión', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new PublicarFichaAdopcion(repositorioFichas, repositorioPerfil);

    const resultado = await caso.ejecutar({ datosCrudos: datosCrudosValidos, municipioId });

    expect(resultado.estado).toBe('disponible');
    expect(resultado.municipioId).toBe(municipioId);
    expect(resultado.nombreAnimal).toBe('Luna');
    expect(repositorioFichas.crear).toHaveBeenCalledWith({
      municipioId,
      nombreAnimal: 'Luna',
      especie: 'perro',
      edadAproximada: null,
      tamano: null,
      temperamento: null,
      estadoSalud: null,
      requisitosAdopcion: null,
      fotoUrl: datosCrudosValidos.fotoUrl,
      nivelEnergia: null,
      compatibleNinos: null,
      compatibleOtrosAnimales: null,
      necesidadesMedicasDetalle: null,
    });
  });

  it('persiste los campos opcionales cuando se declaran', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new PublicarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, edadAproximada: 3, tamano: 'mediano', temperamento: 'Sociable' },
      municipioId,
    });

    expect(repositorioFichas.crear).toHaveBeenCalledWith(
      expect.objectContaining({ edadAproximada: 3, tamano: 'mediano', temperamento: 'Sociable' }),
    );
  });

  // Paso 2 del ticket "Extensión de PublicarFichaAdopcion con columnas de
  // compatibilidad" (Módulo 9): docs/REQUISITOS.md habilita a "Municipio /
  // Organización" a publicar fichas, reemplazando el rol administrador que
  // el MVP permitía (administrador solo tiene R(t) sobre vitrina_adopcion
  // en docs/ROLES.md, nunca alta directa).
  it('permite la publicación también para rol organizacion (Módulo 9)', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes({ rol: 'organizacion' });
    const caso = new PublicarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: datosCrudosValidos, municipioId })).resolves.toMatchObject({
      nombreAnimal: 'Luna',
    });
  });

  it.each(['dueño', 'veterinario', 'administrador'])(
    'rechaza con PEA-MUN-009 (403) para rol %s, sin tocar el repositorio',
    async (rol) => {
      const { repositorioFichas, repositorioPerfil } = crearFakes({ rol });
      const caso = new PublicarFichaAdopcion(repositorioFichas, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: datosCrudosValidos, municipioId })).rejects.toBeInstanceOf(
        SoloMunicipioUOrganizacionPublicaFichaError,
      );
      expect(repositorioFichas.crear).not.toHaveBeenCalled();
    },
  );

  // Paso 1/4 del ticket + AC explícito: los atributos de compatibilidad se
  // persisten cuando se declaran, y no bloquean la publicación cuando faltan
  // (ya cubierto por el primer test de este archivo, que no los declara).
  it('AC: persiste los atributos de compatibilidad cuando se completan (Módulo 9)', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new PublicarFichaAdopcion(repositorioFichas, repositorioPerfil);

    const resultado = await caso.ejecutar({
      datosCrudos: {
        ...datosCrudosValidos,
        nivelEnergia: 'alto',
        compatibleNinos: true,
        compatibleOtrosAnimales: false,
        necesidadesMedicasDetalle: 'Requiere medicación diaria para epilepsia.',
      },
      municipioId,
    });

    expect(resultado.nivelEnergia).toBe('alto');
    expect(resultado.compatibleNinos).toBe(true);
    expect(resultado.compatibleOtrosAnimales).toBe(false);
    expect(resultado.necesidadesMedicasDetalle).toBe('Requiere medicación diaria para epilepsia.');
    expect(repositorioFichas.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        nivelEnergia: 'alto',
        compatibleNinos: true,
        compatibleOtrosAnimales: false,
        necesidadesMedicasDetalle: 'Requiere medicación diaria para epilepsia.',
      }),
    );
  });

  it('rechaza fail-fast (Zod) un nivelEnergia fuera del catálogo soportado', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new PublicarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, nivelEnergia: 'extremo' }, municipioId }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repositorioFichas.crear).not.toHaveBeenCalled();
  });

  it.each(['nombreAnimal', 'especie', 'fotoUrl'] as const)(
    'rechaza fail-fast (Zod) cuando falta "%s" (Paso 2 / AC)',
    async (campo) => {
      const { repositorioFichas, repositorioPerfil } = crearFakes();
      const caso = new PublicarFichaAdopcion(repositorioFichas, repositorioPerfil);
      const sinCampo = { ...datosCrudosValidos };
      delete (sinCampo as Record<string, unknown>)[campo];

      await expect(caso.ejecutar({ datosCrudos: sinCampo, municipioId })).rejects.toBeInstanceOf(ZodError);
      expect(repositorioFichas.crear).not.toHaveBeenCalled();
    },
  );

  it('rechaza una fotoUrl que no es una URL válida', async () => {
    const { repositorioFichas, repositorioPerfil } = crearFakes();
    const caso = new PublicarFichaAdopcion(repositorioFichas, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, fotoUrl: 'no-es-una-url' }, municipioId }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
