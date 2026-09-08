/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { RegistrarEntradaLibreta } from '@aplicacion/casos-de-uso/veterinarios/RegistrarEntradaLibreta';
import type { AutorizacionLibretaPersistida, IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { EntradaLibretaPersistida, IRepositorioEntradasLibreta } from '@dominio/puertos/IRepositorioEntradasLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { Mascota } from '@dominio/entidades/Mascota';
import {
  CuentaVeterinariaNoVerificadaError,
  MascotaSinAccesoLibretaError,
  SinAutorizacionLibretaError,
  AutorizacionLibretaRevocadaError,
  TipoEntradaInvalidoError,
} from '@dominio/errores/erroresVeterinarios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const veterinarioId = '22222222-2222-4222-8222-222222222222';
const mascotaId = '11111111-1111-4111-8111-111111111111';

const mascota = Mascota.reconstruir(mascotaId, {
  dueñoId: 'dueno-1',
  nombre: 'Toby',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
  raza: null,
  edadAproximada: null,
  identificacionChip: null,
});

const perfilVeterinarioVerificado: ResumenPerfilPropio = {
  id: veterinarioId,
  email: 'vet@example.com',
  rol: 'veterinario',
  estadoVerificacion: 'verificado',
  verificadoEn: new Date('2026-01-01T00:00:00.000Z'),
};

const autorizacionActiva: AutorizacionLibretaPersistida = {
  id: 'autorizacion-1',
  mascotaId,
  veterinarioId,
  otorgadaEn: new Date('2026-01-05T00:00:00.000Z'),
  revocadaEn: null,
};

const entradaPersistida: EntradaLibretaPersistida = {
  id: 'entrada-1',
  mascotaId,
  veterinarioId,
  tipo: 'vacuna',
  descripcion: 'Vacuna antirrábica aplicada, sin reacciones adversas.',
  fecha: '2026-09-08',
  createdAt: new Date('2026-09-08T12:00:00.000Z'),
};

function crearFakes(opciones?: {
  perfil?: ResumenPerfilPropio | null;
  mascotaEncontrada?: Mascota | null;
  autorizacion?: AutorizacionLibretaPersistida | null;
}) {
  const repositorioAutorizaciones: jest.Mocked<IRepositorioAutorizacionesLibreta> = {
    obtenerActual: jest.fn().mockResolvedValue(opciones?.autorizacion === undefined ? autorizacionActiva : opciones.autorizacion),
  };
  const repositorioEntradas: jest.Mocked<IRepositorioEntradasLibreta> = {
    crear: jest.fn().mockResolvedValue(entradaPersistida),
  };
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn(),
    buscarPorId: jest.fn().mockResolvedValue(opciones?.mascotaEncontrada === undefined ? mascota : opciones.mascotaEncontrada),
    listarPorDueño: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest
      .fn()
      .mockResolvedValue(opciones?.perfil === undefined ? perfilVeterinarioVerificado : opciones.perfil),
  };
  return { repositorioAutorizaciones, repositorioEntradas, repositorioMascotas, repositorioPerfil };
}

const entradaCruda = {
  datosCrudos: {
    mascotaId,
    tipo: 'vacuna',
    descripcion: 'Vacuna antirrábica aplicada, sin reacciones adversas.',
    fecha: '2026-09-08',
  },
  veterinarioId,
};

describe('RegistrarEntradaLibreta', () => {
  it('registra la entrada cuando el veterinario está verificado y tiene autorización activa', async () => {
    const fakes = crearFakes();
    const caso = new RegistrarEntradaLibreta(
      fakes.repositorioAutorizaciones,
      fakes.repositorioEntradas,
      fakes.repositorioMascotas,
      fakes.repositorioPerfil,
    );

    const resultado = await caso.ejecutar(entradaCruda);

    expect(fakes.repositorioAutorizaciones.obtenerActual).toHaveBeenCalledWith(mascotaId, veterinarioId);
    expect(fakes.repositorioEntradas.crear).toHaveBeenCalledWith(mascotaId, veterinarioId, {
      tipo: 'vacuna',
      descripcion: 'Vacuna antirrábica aplicada, sin reacciones adversas.',
      fecha: '2026-09-08',
    });
    expect(resultado).toEqual({ ...entradaPersistida, createdAt: entradaPersistida.createdAt.toISOString() });
  });

  it('rechaza fail-fast (Zod) un tipo fuera del enum soportado mapeándolo a PEA-VET-006', async () => {
    const fakes = crearFakes();
    const caso = new RegistrarEntradaLibreta(
      fakes.repositorioAutorizaciones,
      fakes.repositorioEntradas,
      fakes.repositorioMascotas,
      fakes.repositorioPerfil,
    );

    await expect(
      caso.ejecutar({ ...entradaCruda, datosCrudos: { ...entradaCruda.datosCrudos, tipo: 'cirugia' } }),
    ).rejects.toBeInstanceOf(TipoEntradaInvalidoError);
    expect(fakes.repositorioPerfil.obtenerPerfilPropio).not.toHaveBeenCalled();
  });

  it('rechaza (Zod genérico) una fecha con formato inválido', async () => {
    const fakes = crearFakes();
    const caso = new RegistrarEntradaLibreta(
      fakes.repositorioAutorizaciones,
      fakes.repositorioEntradas,
      fakes.repositorioMascotas,
      fakes.repositorioPerfil,
    );

    await expect(
      caso.ejecutar({ ...entradaCruda, datosCrudos: { ...entradaCruda.datosCrudos, fecha: '08-09-2026' } }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('rechaza con 403 si quien invoca no es veterinario', async () => {
    const fakes = crearFakes({ perfil: { ...perfilVeterinarioVerificado, rol: 'dueño' } });
    const caso = new RegistrarEntradaLibreta(
      fakes.repositorioAutorizaciones,
      fakes.repositorioEntradas,
      fakes.repositorioMascotas,
      fakes.repositorioPerfil,
    );

    await expect(caso.ejecutar(entradaCruda)).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(fakes.repositorioEntradas.crear).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-VET-007 si la matrícula del veterinario no está verificada', async () => {
    const fakes = crearFakes({ perfil: { ...perfilVeterinarioVerificado, estadoVerificacion: 'pendiente' } });
    const caso = new RegistrarEntradaLibreta(
      fakes.repositorioAutorizaciones,
      fakes.repositorioEntradas,
      fakes.repositorioMascotas,
      fakes.repositorioPerfil,
    );

    await expect(caso.ejecutar(entradaCruda)).rejects.toBeInstanceOf(CuentaVeterinariaNoVerificadaError);
    expect(fakes.repositorioMascotas.buscarPorId).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-VET-005 si la mascota no existe o está soft-deleted', async () => {
    const fakes = crearFakes({ mascotaEncontrada: null });
    const caso = new RegistrarEntradaLibreta(
      fakes.repositorioAutorizaciones,
      fakes.repositorioEntradas,
      fakes.repositorioMascotas,
      fakes.repositorioPerfil,
    );

    await expect(caso.ejecutar(entradaCruda)).rejects.toBeInstanceOf(MascotaSinAccesoLibretaError);
    expect(fakes.repositorioAutorizaciones.obtenerActual).not.toHaveBeenCalled();
  });

  it('AC (verificación de autorización activa): rechaza con PEA-VET-003 si el dueño nunca autorizó a este veterinario', async () => {
    const fakes = crearFakes({ autorizacion: null });
    const caso = new RegistrarEntradaLibreta(
      fakes.repositorioAutorizaciones,
      fakes.repositorioEntradas,
      fakes.repositorioMascotas,
      fakes.repositorioPerfil,
    );

    await expect(caso.ejecutar(entradaCruda)).rejects.toBeInstanceOf(SinAutorizacionLibretaError);
    expect(fakes.repositorioEntradas.crear).not.toHaveBeenCalled();
  });

  it('AC (verificación de autorización activa): rechaza con PEA-VET-004 si la autorización fue revocada', async () => {
    const fakes = crearFakes({
      autorizacion: { ...autorizacionActiva, revocadaEn: new Date('2026-02-01T00:00:00.000Z') },
    });
    const caso = new RegistrarEntradaLibreta(
      fakes.repositorioAutorizaciones,
      fakes.repositorioEntradas,
      fakes.repositorioMascotas,
      fakes.repositorioPerfil,
    );

    await expect(caso.ejecutar(entradaCruda)).rejects.toBeInstanceOf(AutorizacionLibretaRevocadaError);
    expect(fakes.repositorioEntradas.crear).not.toHaveBeenCalled();
  });
});
