/**
 * @jest-environment node
 */
import { ListarAutorizacionesLibreta } from '@aplicacion/casos-de-uso/veterinarios/ListarAutorizacionesLibreta';
import type { AutorizacionLibretaPersistida, IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { Mascota } from '@dominio/entidades/Mascota';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
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

const historial: AutorizacionLibretaPersistida[] = [
  { id: 'autorizacion-2', mascotaId, veterinarioId, otorgadaEn: new Date('2026-03-01T00:00:00.000Z'), revocadaEn: null },
  {
    id: 'autorizacion-1',
    mascotaId,
    veterinarioId: '33333333-3333-4333-8333-333333333333',
    otorgadaEn: new Date('2026-01-05T00:00:00.000Z'),
    revocadaEn: new Date('2026-02-01T00:00:00.000Z'),
  },
];

function crearFakes(opciones?: { mascotaEncontrada?: Mascota | null }) {
  const repositorioAutorizaciones: jest.Mocked<IRepositorioAutorizacionesLibreta> = {
    obtenerActual: jest.fn(),
    crear: jest.fn(),
    revocar: jest.fn(),
    listarPorMascota: jest.fn().mockResolvedValue(historial),
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

describe('ListarAutorizacionesLibreta', () => {
  it('devuelve el historial completo (vigentes y revocadas) cuando la mascota pertenece a quien invoca', async () => {
    const fakes = crearFakes();
    const caso = new ListarAutorizacionesLibreta(fakes.repositorioAutorizaciones, fakes.repositorioMascotas);

    const resultado = await caso.ejecutar({ mascotaId, dueñoId });

    expect(fakes.repositorioAutorizaciones.listarPorMascota).toHaveBeenCalledWith(mascotaId);
    expect(resultado).toHaveLength(2);
    expect(resultado[0]?.revocadaEn).toBeNull();
    expect(resultado[1]?.revocadaEn).toBe(historial[1]?.revocadaEn?.toISOString());
  });

  it('rechaza con 404/PEA-AUTH-009 si la mascota no existe', async () => {
    const fakes = crearFakes({ mascotaEncontrada: null });
    const caso = new ListarAutorizacionesLibreta(fakes.repositorioAutorizaciones, fakes.repositorioMascotas);

    await expect(caso.ejecutar({ mascotaId, dueñoId })).rejects.toBeInstanceOf(MascotaNoEncontradaError);
    expect(fakes.repositorioAutorizaciones.listarPorMascota).not.toHaveBeenCalled();
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
    const caso = new ListarAutorizacionesLibreta(fakes.repositorioAutorizaciones, fakes.repositorioMascotas);

    await expect(caso.ejecutar({ mascotaId, dueñoId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
  });
});
