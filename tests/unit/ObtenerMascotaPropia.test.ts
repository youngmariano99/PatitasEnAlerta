/**
 * @jest-environment node
 */
import { ObtenerMascotaPropia } from '@aplicacion/casos-de-uso/mascotas/ObtenerMascotaPropia';
import { Mascota } from '@dominio/entidades/Mascota';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const dueñoId = '11111111-1111-1111-1111-111111111111';
const otroDueñoId = '55555555-5555-5555-5555-555555555555';
const mascotaId = '22222222-2222-2222-2222-222222222222';

const mascotaPropia = Mascota.reconstruir(mascotaId, {
  dueñoId,
  nombre: 'Toby',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/toby.jpg',
  raza: null,
  edadAproximada: null,
  identificacionChip: null,
});

function crearFakes(opciones?: { mascota?: Mascota | null }) {
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn(),
    buscarPorId: jest
      .fn()
      .mockResolvedValue(opciones && 'mascota' in opciones ? opciones.mascota : mascotaPropia),
    listarPorDueño: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
  };
  return { repositorioMascotas };
}

describe('ObtenerMascotaPropia', () => {
  it('devuelve la ficha cuando la mascota pertenece a quien invoca', async () => {
    const { repositorioMascotas } = crearFakes();
    const caso = new ObtenerMascotaPropia(repositorioMascotas);

    const resultado = await caso.ejecutar({ id: mascotaId, dueñoIdSolicitante: dueñoId });

    expect(resultado.id).toBe(mascotaId);
    expect(resultado.nombre).toBe('Toby');
  });

  it('responde 404 / PEA-AUTH-009 si la mascota no existe', async () => {
    const { repositorioMascotas } = crearFakes({ mascota: null });
    const caso = new ObtenerMascotaPropia(repositorioMascotas);

    await expect(
      caso.ejecutar({ id: mascotaId, dueñoIdSolicitante: dueñoId }),
    ).rejects.toBeInstanceOf(MascotaNoEncontradaError);
  });

  it('AC (anti-IDOR): responde 403 / PEA-SIS-002 si la mascota es de otro dueño, sin revelar que existe', async () => {
    const { repositorioMascotas } = crearFakes();
    const caso = new ObtenerMascotaPropia(repositorioMascotas);

    await expect(
      caso.ejecutar({ id: mascotaId, dueñoIdSolicitante: otroDueñoId }),
    ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
  });
});
