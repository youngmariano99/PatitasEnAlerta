/**
 * @jest-environment node
 */
import { CompartirHistorial } from '@aplicacion/casos-de-uso/veterinarios-avanzado/CompartirHistorial';
import type {
  HistorialCompartido,
  IRepositorioHistorialesCompartidos,
} from '@dominio/puertos/IRepositorioHistorialesCompartidos';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { Mascota } from '@dominio/entidades/Mascota';
import { HistorialCompartidoConUnoMismoError } from '@dominio/errores/erroresVeterinariosAvanzados';
import { VeterinarioNoEncontradoError } from '@dominio/errores/erroresVeterinarios';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const veterinarioOrigenId = '11111111-1111-1111-1111-111111111111';
const veterinarioDestinoId = '22222222-2222-2222-2222-222222222222';
const mascotaId = '33333333-3333-3333-3333-333333333333';

const datosValidos = { mascotaId, veterinarioDestinoId };

function crearPerfil(id: string, rol: string): ResumenPerfilPropio {
  return {
    id,
    email: 'vet@ejemplo.test',
    rol,
    estadoVerificacion: 'verificado',
    verificadoEn: new Date(),
  };
}

function crearMascota(): Mascota {
  return Mascota.reconstruir(mascotaId, {
    dueñoId: 'dueño-1',
    nombre: 'Firulais',
    especie: 'perro',
    fotoUrl: 'https://ejemplo.test/foto.jpg',
    raza: null,
    edadAproximada: null,
    identificacionChip: null,
  });
}

function crearFakes(opciones?: {
  rolOrigen?: string;
  rolDestino?: string;
  mascota?: Mascota | null;
}) {
  const historialCreado: HistorialCompartido = {
    id: 'historial-1',
    mascotaId,
    veterinarioOrigenId,
    veterinarioDestinoId,
    autorizadoEn: new Date('2026-09-14T10:00:00.000Z'),
    revocadoEn: null,
  };
  const repositorioHistoriales: jest.Mocked<IRepositorioHistorialesCompartidos> = {
    crear: jest.fn().mockResolvedValue(historialCreado),
    obtenerActual: jest.fn(),
    listarPorOrigen: jest.fn(),
    revocar: jest.fn(),
  };
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn(),
    buscarPorId: jest
      .fn()
      .mockResolvedValue(opciones?.mascota === undefined ? crearMascota() : opciones.mascota),
    listarPorDueño: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn(async (id: string) => {
      if (id === veterinarioOrigenId) return crearPerfil(id, opciones?.rolOrigen ?? 'veterinario');
      if (id === veterinarioDestinoId)
        return crearPerfil(id, opciones?.rolDestino ?? 'veterinario');
      return null;
    }),
  };
  return { repositorioHistoriales, repositorioMascotas, repositorioPerfil, historialCreado };
}

describe('CompartirHistorial', () => {
  it('Paso 1: crea el historial compartido con veterinarioOrigenId de la sesión', async () => {
    const { repositorioHistoriales, repositorioMascotas, repositorioPerfil, historialCreado } =
      crearFakes();
    const caso = new CompartirHistorial(
      repositorioHistoriales,
      repositorioMascotas,
      repositorioPerfil,
    );

    const resultado = await caso.ejecutar({ datosCrudos: datosValidos, veterinarioOrigenId });

    expect(resultado.id).toBe(historialCreado.id);
    expect(repositorioHistoriales.crear).toHaveBeenCalledWith({
      mascotaId,
      veterinarioOrigenId,
      veterinarioDestinoId,
    });
  });

  it('AC: rechaza con 400 / PEA-VETADV-003 cuando origen y destino son el mismo veterinario', async () => {
    const { repositorioHistoriales, repositorioMascotas, repositorioPerfil } = crearFakes();
    const caso = new CompartirHistorial(
      repositorioHistoriales,
      repositorioMascotas,
      repositorioPerfil,
    );

    await expect(
      caso.ejecutar({
        datosCrudos: { mascotaId, veterinarioDestinoId: veterinarioOrigenId },
        veterinarioOrigenId,
      }),
    ).rejects.toBeInstanceOf(HistorialCompartidoConUnoMismoError);
    expect(repositorioHistoriales.crear).not.toHaveBeenCalled();
  });

  it.each(['dueño', 'rescatista', 'organizacion', 'municipio', 'administrador', 'comerciante'])(
    'rechaza con 403 / PEA-SIS-002 cuando quien invoca tiene rol %s',
    async (rol) => {
      const { repositorioHistoriales, repositorioMascotas, repositorioPerfil } = crearFakes({
        rolOrigen: rol,
      });
      const caso = new CompartirHistorial(
        repositorioHistoriales,
        repositorioMascotas,
        repositorioPerfil,
      );

      await expect(
        caso.ejecutar({ datosCrudos: datosValidos, veterinarioOrigenId }),
      ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
      expect(repositorioHistoriales.crear).not.toHaveBeenCalled();
    },
  );

  it('responde 404 / PEA-AUTH-009 si la mascota no existe', async () => {
    const { repositorioHistoriales, repositorioMascotas, repositorioPerfil } = crearFakes({
      mascota: null,
    });
    const caso = new CompartirHistorial(
      repositorioHistoriales,
      repositorioMascotas,
      repositorioPerfil,
    );

    await expect(
      caso.ejecutar({ datosCrudos: datosValidos, veterinarioOrigenId }),
    ).rejects.toBeInstanceOf(MascotaNoEncontradaError);
    expect(repositorioHistoriales.crear).not.toHaveBeenCalled();
  });

  it('responde 404 / PEA-VET-011 si el destino no corresponde a un veterinario', async () => {
    const { repositorioHistoriales, repositorioMascotas, repositorioPerfil } = crearFakes({
      rolDestino: 'dueño',
    });
    const caso = new CompartirHistorial(
      repositorioHistoriales,
      repositorioMascotas,
      repositorioPerfil,
    );

    await expect(
      caso.ejecutar({ datosCrudos: datosValidos, veterinarioOrigenId }),
    ).rejects.toBeInstanceOf(VeterinarioNoEncontradoError);
    expect(repositorioHistoriales.crear).not.toHaveBeenCalled();
  });
});
