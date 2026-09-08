/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { AutorizarVeterinario } from '@aplicacion/casos-de-uso/veterinarios/AutorizarVeterinario';
import type { AutorizacionLibretaPersistida, IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { Mascota } from '@dominio/entidades/Mascota';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AutorizacionLibretaYaActivaError, VeterinarioNoEncontradoError } from '@dominio/errores/erroresVeterinarios';
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

const perfilVeterinario: ResumenPerfilPropio = {
  id: veterinarioId,
  email: 'vet@example.com',
  rol: 'veterinario',
  estadoVerificacion: 'verificado',
  verificadoEn: new Date('2026-01-01T00:00:00.000Z'),
};

const autorizacionCreada: AutorizacionLibretaPersistida = {
  id: 'autorizacion-1',
  mascotaId,
  veterinarioId,
  otorgadaEn: new Date('2026-09-08T12:00:00.000Z'),
  revocadaEn: null,
};

function crearFakes(opciones?: {
  perfil?: ResumenPerfilPropio | null;
  mascotaEncontrada?: Mascota | null;
  autorizacionActual?: AutorizacionLibretaPersistida | null;
}) {
  const repositorioAutorizaciones: jest.Mocked<IRepositorioAutorizacionesLibreta> = {
    obtenerActual: jest.fn().mockResolvedValue(opciones?.autorizacionActual === undefined ? null : opciones.autorizacionActual),
    crear: jest.fn().mockResolvedValue(autorizacionCreada),
    revocar: jest.fn(),
    listarPorMascota: jest.fn(),
  };
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn(),
    buscarPorId: jest.fn().mockResolvedValue(opciones?.mascotaEncontrada === undefined ? mascota : opciones.mascotaEncontrada),
    listarPorDueño: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(opciones?.perfil === undefined ? perfilVeterinario : opciones.perfil),
  };
  return { repositorioAutorizaciones, repositorioMascotas, repositorioPerfil };
}

const entradaValida = { datosCrudos: { veterinarioId }, mascotaId, dueñoId };

describe('AutorizarVeterinario', () => {
  it('otorga la autorización cuando la mascota es propia y el veterinarioId es válido', async () => {
    const fakes = crearFakes();
    const caso = new AutorizarVeterinario(fakes.repositorioAutorizaciones, fakes.repositorioMascotas, fakes.repositorioPerfil);

    const resultado = await caso.ejecutar(entradaValida);

    expect(fakes.repositorioAutorizaciones.crear).toHaveBeenCalledWith(mascotaId, veterinarioId);
    expect(resultado).toEqual({
      id: autorizacionCreada.id,
      mascotaId,
      veterinarioId,
      otorgadaEn: autorizacionCreada.otorgadaEn.toISOString(),
      revocadaEn: null,
    });
  });

  it('rechaza (Zod) un veterinarioId con formato inválido', async () => {
    const fakes = crearFakes();
    const caso = new AutorizarVeterinario(fakes.repositorioAutorizaciones, fakes.repositorioMascotas, fakes.repositorioPerfil);

    await expect(caso.ejecutar({ ...entradaValida, datosCrudos: { veterinarioId: 'no-es-uuid' } })).rejects.toBeInstanceOf(ZodError);
    expect(fakes.repositorioMascotas.buscarPorId).not.toHaveBeenCalled();
  });

  it('rechaza con 404/PEA-AUTH-009 si la mascota no existe', async () => {
    const fakes = crearFakes({ mascotaEncontrada: null });
    const caso = new AutorizarVeterinario(fakes.repositorioAutorizaciones, fakes.repositorioMascotas, fakes.repositorioPerfil);

    await expect(caso.ejecutar(entradaValida)).rejects.toBeInstanceOf(MascotaNoEncontradaError);
    expect(fakes.repositorioPerfil.obtenerPerfilPropio).not.toHaveBeenCalled();
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
    const caso = new AutorizarVeterinario(fakes.repositorioAutorizaciones, fakes.repositorioMascotas, fakes.repositorioPerfil);

    await expect(caso.ejecutar(entradaValida)).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(fakes.repositorioAutorizaciones.crear).not.toHaveBeenCalled();
  });

  it('rechaza con 404/PEA-VET-011 si el veterinarioId indicado no corresponde a un usuario con rol veterinario', async () => {
    const fakes = crearFakes({ perfil: { ...perfilVeterinario, rol: 'dueño' } });
    const caso = new AutorizarVeterinario(fakes.repositorioAutorizaciones, fakes.repositorioMascotas, fakes.repositorioPerfil);

    await expect(caso.ejecutar(entradaValida)).rejects.toBeInstanceOf(VeterinarioNoEncontradoError);
    expect(fakes.repositorioAutorizaciones.crear).not.toHaveBeenCalled();
  });

  it('rechaza con 404/PEA-VET-011 si el usuario indicado no existe', async () => {
    const fakes = crearFakes({ perfil: null });
    const caso = new AutorizarVeterinario(fakes.repositorioAutorizaciones, fakes.repositorioMascotas, fakes.repositorioPerfil);

    await expect(caso.ejecutar(entradaValida)).rejects.toBeInstanceOf(VeterinarioNoEncontradoError);
  });

  it('rechaza con 409/PEA-VET-009 si ya existe una autorización activa para ese par', async () => {
    const fakes = crearFakes({
      autorizacionActual: { id: 'autorizacion-0', mascotaId, veterinarioId, otorgadaEn: new Date('2026-01-01T00:00:00.000Z'), revocadaEn: null },
    });
    const caso = new AutorizarVeterinario(fakes.repositorioAutorizaciones, fakes.repositorioMascotas, fakes.repositorioPerfil);

    await expect(caso.ejecutar(entradaValida)).rejects.toBeInstanceOf(AutorizacionLibretaYaActivaError);
    expect(fakes.repositorioAutorizaciones.crear).not.toHaveBeenCalled();
  });

  it('permite reautorizar (nueva fila) cuando la autorización previa ya estaba revocada', async () => {
    const fakes = crearFakes({
      autorizacionActual: {
        id: 'autorizacion-0',
        mascotaId,
        veterinarioId,
        otorgadaEn: new Date('2026-01-01T00:00:00.000Z'),
        revocadaEn: new Date('2026-02-01T00:00:00.000Z'),
      },
    });
    const caso = new AutorizarVeterinario(fakes.repositorioAutorizaciones, fakes.repositorioMascotas, fakes.repositorioPerfil);

    await caso.ejecutar(entradaValida);

    expect(fakes.repositorioAutorizaciones.crear).toHaveBeenCalledWith(mascotaId, veterinarioId);
  });
});
