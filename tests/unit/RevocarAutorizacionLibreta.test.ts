/**
 * @jest-environment node
 */
import { RevocarAutorizacionLibreta } from '@aplicacion/casos-de-uso/veterinarios/RevocarAutorizacionLibreta';
import type { AutorizacionLibretaPersistida, IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { Mascota } from '@dominio/entidades/Mascota';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AutorizacionLibretaNoEncontradaError } from '@dominio/errores/erroresVeterinarios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const dueñoId = 'dueno-1';
const veterinarioId = '22222222-2222-4222-8222-222222222222';
const mascotaId = '11111111-1111-4111-8111-111111111111';

const mascota = Mascota.reconstruir(mascotaId, {
  dueñoId,
  nombre: 'Toby',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
  raza: null,
  edadAproximada: null,
  identificacionChip: null,
});

const autorizacionRevocada: AutorizacionLibretaPersistida = {
  id: 'autorizacion-1',
  mascotaId,
  veterinarioId,
  otorgadaEn: new Date('2026-01-05T00:00:00.000Z'),
  revocadaEn: new Date('2026-09-08T12:00:00.000Z'),
};

function crearFakes(opciones?: { mascotaEncontrada?: Mascota | null; revocada?: AutorizacionLibretaPersistida | null }) {
  const repositorioAutorizaciones: jest.Mocked<IRepositorioAutorizacionesLibreta> = {
    obtenerActual: jest.fn(),
    crear: jest.fn(),
    revocar: jest.fn().mockResolvedValue(opciones?.revocada === undefined ? autorizacionRevocada : opciones.revocada),
    listarPorMascota: jest.fn(),
  };
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn(),
    buscarPorId: jest.fn().mockResolvedValue(opciones?.mascotaEncontrada === undefined ? mascota : opciones.mascotaEncontrada),
    listarPorDueño: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
  };
  return { repositorioAutorizaciones, repositorioMascotas };
}

const comando = { mascotaId, veterinarioId, dueñoId };

describe('RevocarAutorizacionLibreta', () => {
  it('revoca la autorización activa cuando la mascota pertenece a quien invoca', async () => {
    const fakes = crearFakes();
    const caso = new RevocarAutorizacionLibreta(fakes.repositorioAutorizaciones, fakes.repositorioMascotas);

    const resultado = await caso.ejecutar(comando);

    expect(fakes.repositorioAutorizaciones.revocar).toHaveBeenCalledWith(mascotaId, veterinarioId);
    expect(resultado.revocadaEn).toBe(autorizacionRevocada.revocadaEn!.toISOString());
  });

  it('rechaza con 404/PEA-AUTH-009 si la mascota no existe', async () => {
    const fakes = crearFakes({ mascotaEncontrada: null });
    const caso = new RevocarAutorizacionLibreta(fakes.repositorioAutorizaciones, fakes.repositorioMascotas);

    await expect(caso.ejecutar(comando)).rejects.toBeInstanceOf(MascotaNoEncontradaError);
    expect(fakes.repositorioAutorizaciones.revocar).not.toHaveBeenCalled();
  });

  it('rechaza con 403/PEA-SIS-002 (anti-IDOR) si la mascota no pertenece a quien invoca', async () => {
    const mascotaDeOtro = Mascota.reconstruir(mascotaId, {
      dueñoId: 'otro-dueno',
      nombre: mascota.nombre,
      especie: mascota.especie,
      fotoUrl: mascota.fotoUrl,
      raza: mascota.raza,
      edadAproximada: mascota.edadAproximada,
      identificacionChip: mascota.identificacionChip,
    });
    const fakes = crearFakes({ mascotaEncontrada: mascotaDeOtro });
    const caso = new RevocarAutorizacionLibreta(fakes.repositorioAutorizaciones, fakes.repositorioMascotas);

    await expect(caso.ejecutar(comando)).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(fakes.repositorioAutorizaciones.revocar).not.toHaveBeenCalled();
  });

  it('rechaza con 404/PEA-VET-010 si no hay una autorización activa para ese par', async () => {
    const fakes = crearFakes({ revocada: null });
    const caso = new RevocarAutorizacionLibreta(fakes.repositorioAutorizaciones, fakes.repositorioMascotas);

    await expect(caso.ejecutar(comando)).rejects.toBeInstanceOf(AutorizacionLibretaNoEncontradaError);
  });
});
