/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { CrearEvento } from '@aplicacion/casos-de-uso/municipio/CrearEvento';
import type { GenerarTurnosEvento } from '@aplicacion/casos-de-uso/municipio/GenerarTurnosEvento';
import { Evento } from '@dominio/entidades/Evento';
import type { DatosNuevoEvento, IRepositorioEventos } from '@dominio/puertos/IRepositorioEventos';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { FechaEventoPasadaError, SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';

const municipioId = '11111111-1111-1111-1111-111111111111';
const FECHA_FUTURA = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const FECHA_PASADA = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const datosCrudosValidos = {
  titulo: 'Jornada de castración — Barrio Norte',
  tipo: 'castracion',
  direccion: 'Calle 25 N° 450',
  latitud: -37.9989,
  longitud: -61.3565,
  fecha: FECHA_FUTURA,
  cuposTotales: 30,
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: municipioId, email: 'municipio@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string }) {
  const repositorioEventos: jest.Mocked<IRepositorioEventos> = {
    crear: jest.fn().mockImplementation(async (datos: DatosNuevoEvento) =>
      Evento.reconstruir('evento-1', datos, new Date('2026-09-01T09:00:00.000Z')),
    ),
    listar: jest.fn().mockResolvedValue({ items: [], total: 0, pagina: 1, porPagina: 50 }),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'municipio')),
  };
  const generarTurnosEvento = { ejecutar: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<GenerarTurnosEvento>;
  return { repositorioEventos, repositorioPerfil, generarTurnosEvento };
}

describe('CrearEvento', () => {
  it('crea el evento con municipioId resuelto por la sesión, para rol municipio', async () => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes();
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);

    const resultado = await caso.ejecutar({ datosCrudos: datosCrudosValidos, municipioId });

    expect(resultado.titulo).toBe(datosCrudosValidos.titulo);
    expect(resultado.municipioId).toBe(municipioId);
    expect(resultado.cuposTotales).toBe(30);
    expect(repositorioEventos.crear).toHaveBeenCalledWith(
      expect.objectContaining({ municipioId, titulo: datosCrudosValidos.titulo, cuposTotales: 30, requisitos: null }),
    );
  });

  it('Paso 1: ejecuta GenerarTurnosEvento con el evento recién creado (id, municipioId, fecha, cuposTotales)', async () => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes();
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);

    const resultado = await caso.ejecutar({ datosCrudos: datosCrudosValidos, municipioId });

    expect(generarTurnosEvento.ejecutar).toHaveBeenCalledWith({
      id: resultado.id,
      municipioId: resultado.municipioId,
      fecha: new Date(resultado.fecha),
      cuposTotales: resultado.cuposTotales,
    });
  });

  it('permite la publicación también para rol administrador', async () => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes({ rol: 'administrador' });
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);

    await expect(caso.ejecutar({ datosCrudos: datosCrudosValidos, municipioId })).resolves.toMatchObject({
      titulo: datosCrudosValidos.titulo,
    });
  });

  it('persiste requisitos cuando se declara', async () => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes();
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);

    await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, requisitos: 'Traer collar/bozal y DNI del tutor.' },
      municipioId,
    });

    expect(repositorioEventos.crear).toHaveBeenCalledWith(
      expect.objectContaining({ requisitos: 'Traer collar/bozal y DNI del tutor.' }),
    );
  });

  it.each(['dueño', 'veterinario'])('rechaza con PEA-MUN-005 (403) para rol %s, sin tocar el repositorio', async (rol) => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes({ rol });
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);

    await expect(caso.ejecutar({ datosCrudos: datosCrudosValidos, municipioId })).rejects.toBeInstanceOf(
      SoloMunicipioAdministraEventosError,
    );
    expect(repositorioEventos.crear).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) sin persistir cuando falta el título', async () => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes();
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { titulo: _titulo, ...sinTitulo } = datosCrudosValidos;

    await expect(caso.ejecutar({ datosCrudos: sinTitulo, municipioId })).rejects.toBeInstanceOf(ZodError);
    expect(repositorioEventos.crear).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) con cuposTotales=0', async () => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes();
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, cuposTotales: 0 }, municipioId }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repositorioEventos.crear).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) con cuposTotales negativo', async () => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes();
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, cuposTotales: -5 }, municipioId }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('rechaza con PEA-MUN-004 (400) una fecha anterior a hoy, sin persistir nada (AC)', async () => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes();
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, fecha: FECHA_PASADA }, municipioId }),
    ).rejects.toBeInstanceOf(FechaEventoPasadaError);
    expect(repositorioEventos.crear).not.toHaveBeenCalled();
  });

  it('rechaza un tipo fuera del catálogo soportado', async () => {
    const { repositorioEventos, repositorioPerfil, generarTurnosEvento } = crearFakes();
    const caso = new CrearEvento(repositorioEventos, repositorioPerfil, generarTurnosEvento);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, tipo: 'incendio' }, municipioId }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
