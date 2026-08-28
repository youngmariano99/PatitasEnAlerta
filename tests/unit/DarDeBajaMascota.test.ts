/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { DarDeBajaMascota } from '@aplicacion/casos-de-uso/mascotas/DarDeBajaMascota';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { Mascota } from '@dominio/entidades/Mascota';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const idValido = '11111111-1111-4111-8111-111111111111';
const otroDueño = '22222222-2222-4222-8222-222222222222';

const mascotaExistente = Mascota.reconstruir(idValido, {
  dueñoId: otroDueño,
  nombre: 'Toby',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
  raza: null,
  edadAproximada: null,
  identificacionChip: null,
});

function crearFake(mascota: Mascota | null | undefined = mascotaExistente): jest.Mocked<IRepositorioMascotas> {
  return {
    crear: jest.fn(),
    buscarPorId: jest.fn().mockResolvedValue(mascota ?? null),
    listarPorDueño: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn().mockResolvedValue(undefined),
  };
}

describe('DarDeBajaMascota', () => {
  it('da de baja la mascota propia y retorna su id', async () => {
    const repositorioMascotas = crearFake(
      Mascota.reconstruir(idValido, { ...mascotaExistente, dueñoId: otroDueño }),
    );
    const caso = new DarDeBajaMascota(repositorioMascotas);

    const resultado = await caso.ejecutar({ id: idValido, dueñoIdSolicitante: otroDueño });

    expect(repositorioMascotas.darDeBaja).toHaveBeenCalledWith(idValido);
    expect(resultado).toEqual({ id: idValido });
  });

  it('rechaza fail-fast un id mal formado antes de tocar el repositorio', async () => {
    const repositorioMascotas = crearFake();
    const caso = new DarDeBajaMascota(repositorioMascotas);

    await expect(caso.ejecutar({ id: 'no-es-un-uuid', dueñoIdSolicitante: otroDueño })).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(repositorioMascotas.buscarPorId).not.toHaveBeenCalled();
  });

  it('rechaza con 404 si la mascota no existe o ya estaba dada de baja', async () => {
    const repositorioMascotas = crearFake(null);
    const caso = new DarDeBajaMascota(repositorioMascotas);

    await expect(caso.ejecutar({ id: idValido, dueñoIdSolicitante: otroDueño })).rejects.toBeInstanceOf(
      MascotaNoEncontradaError,
    );
    expect(repositorioMascotas.darDeBaja).not.toHaveBeenCalled();
  });

  it('rechaza con 403 (PEA-SIS-002) si un usuario distinto al dueño intenta darla de baja', async () => {
    const repositorioMascotas = crearFake(
      Mascota.reconstruir(idValido, { ...mascotaExistente, dueñoId: otroDueño }),
    );
    const caso = new DarDeBajaMascota(repositorioMascotas);

    await expect(
      caso.ejecutar({ id: idValido, dueñoIdSolicitante: '33333333-3333-4333-8333-333333333333' }),
    ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioMascotas.darDeBaja).not.toHaveBeenCalled();
  });
});
