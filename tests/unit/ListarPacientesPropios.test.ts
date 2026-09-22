/**
 * @jest-environment node
 */
import { ListarPacientesPropios } from '@aplicacion/casos-de-uso/veterinarios/ListarPacientesPropios';
import { Mascota } from '@dominio/entidades/Mascota';
import type {
  AutorizacionLibretaPersistida,
  IRepositorioAutorizacionesLibreta,
} from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';

const veterinarioId = '11111111-1111-1111-1111-111111111111';
const otroVeterinarioId = '55555555-5555-5555-5555-555555555555';

function crearAutorizacion(mascotaId: string): AutorizacionLibretaPersistida {
  return {
    id: `auth-${mascotaId}`,
    mascotaId,
    veterinarioId,
    otorgadaEn: new Date(),
    revocadaEn: null,
  };
}

function crearMascota(id: string): Mascota {
  return Mascota.reconstruir(id, {
    dueñoId: 'dueno-1',
    nombre: 'Toby',
    especie: 'perro',
    fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
    raza: null,
    edadAproximada: null,
    identificacionChip: null,
  });
}

function crearFakes(opciones?: {
  autorizaciones?: AutorizacionLibretaPersistida[];
  mascotaExiste?: boolean;
}) {
  const autorizaciones = opciones?.autorizaciones ?? [crearAutorizacion('mascota-1')];
  const mascotaExiste = opciones?.mascotaExiste ?? true;

  const repositorioAutorizaciones: jest.Mocked<IRepositorioAutorizacionesLibreta> = {
    obtenerActual: jest.fn(),
    crear: jest.fn(),
    revocar: jest.fn(),
    listarPorMascota: jest.fn(),
    listarVigentesPorVeterinario: jest.fn().mockResolvedValue(autorizaciones),
  };
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn(),
    buscarPorId: jest
      .fn()
      .mockImplementation(async (id: string) => (mascotaExiste ? crearMascota(id) : null)),
    listarPorDueño: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
  };
  return { repositorioAutorizaciones, repositorioMascotas };
}

describe('ListarPacientesPropios', () => {
  it('devuelve las mascotas con autorización vigente hacia el veterinario', async () => {
    const { repositorioAutorizaciones, repositorioMascotas } = crearFakes();
    const caso = new ListarPacientesPropios(repositorioAutorizaciones, repositorioMascotas);

    const resultado = await caso.ejecutar(veterinarioId);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.mascotaId).toBe('mascota-1');
    expect(resultado[0]!.nombre).toBe('Toby');
  });

  it('AC: consulta exclusivamente las autorizaciones del veterinario que invoca', async () => {
    const { repositorioAutorizaciones, repositorioMascotas } = crearFakes();
    const caso = new ListarPacientesPropios(repositorioAutorizaciones, repositorioMascotas);

    await caso.ejecutar(otroVeterinarioId);

    expect(repositorioAutorizaciones.listarVigentesPorVeterinario).toHaveBeenCalledWith(
      otroVeterinarioId,
    );
  });

  it('excluye una mascota dada de baja (autorización histórica sin mascota activa)', async () => {
    const { repositorioAutorizaciones, repositorioMascotas } = crearFakes({ mascotaExiste: false });
    const caso = new ListarPacientesPropios(repositorioAutorizaciones, repositorioMascotas);

    await expect(caso.ejecutar(veterinarioId)).resolves.toEqual([]);
  });

  it('devuelve un arreglo vacío si el veterinario no tiene pacientes', async () => {
    const { repositorioAutorizaciones, repositorioMascotas } = crearFakes({ autorizaciones: [] });
    const caso = new ListarPacientesPropios(repositorioAutorizaciones, repositorioMascotas);

    await expect(caso.ejecutar(veterinarioId)).resolves.toEqual([]);
  });
});
