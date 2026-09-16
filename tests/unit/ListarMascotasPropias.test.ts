/**
 * @jest-environment node
 */
import { ListarMascotasPropias } from '@aplicacion/casos-de-uso/mascotas/ListarMascotasPropias';
import { Mascota } from '@dominio/entidades/Mascota';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';

const dueñoId = '11111111-1111-1111-1111-111111111111';
const otroDueñoId = '55555555-5555-5555-5555-555555555555';

function crearMascota(id: string, dueño: string): Mascota {
  return Mascota.reconstruir(id, {
    dueñoId: dueño,
    nombre: 'Toby',
    especie: 'perro',
    fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/toby.jpg',
    raza: null,
    edadAproximada: null,
    identificacionChip: null,
  });
}

function crearFakes(mascotas: Mascota[] = [crearMascota('mascota-1', dueñoId)]) {
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn(),
    buscarPorId: jest.fn(),
    listarPorDueño: jest.fn().mockResolvedValue(mascotas),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
  };
  return { repositorioMascotas };
}

describe('ListarMascotasPropias', () => {
  it('devuelve las mascotas del dueño solicitante', async () => {
    const { repositorioMascotas } = crearFakes();
    const caso = new ListarMascotasPropias(repositorioMascotas);

    const resultado = await caso.ejecutar(dueñoId);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.id).toBe('mascota-1');
    expect(repositorioMascotas.listarPorDueño).toHaveBeenCalledWith(dueñoId);
  });

  it('AC: consulta exclusivamente por el dueñoId de quien invoca, nunca uno ajeno', async () => {
    const { repositorioMascotas } = crearFakes([]);
    const caso = new ListarMascotasPropias(repositorioMascotas);

    await caso.ejecutar(otroDueñoId);

    expect(repositorioMascotas.listarPorDueño).toHaveBeenCalledWith(otroDueñoId);
    expect(repositorioMascotas.listarPorDueño).not.toHaveBeenCalledWith(dueñoId);
  });

  it('devuelve un arreglo vacío cuando el dueño no tiene mascotas', async () => {
    const { repositorioMascotas } = crearFakes([]);
    const caso = new ListarMascotasPropias(repositorioMascotas);

    await expect(caso.ejecutar(dueñoId)).resolves.toEqual([]);
  });
});
