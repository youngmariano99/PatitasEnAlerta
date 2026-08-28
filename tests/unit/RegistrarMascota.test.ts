/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { RegistrarMascota } from '@aplicacion/casos-de-uso/mascotas/RegistrarMascota';
import type { ComandoRegistrarMascota } from '@aplicacion/dtos/mascotas/RegistrarMascotaDto';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { DatosMascota } from '@dominio/entidades/Mascota';
import { Mascota } from '@dominio/entidades/Mascota';
import { FotoObligatoriaError } from '@dominio/errores/erroresMascotas';

function crearFakes(fotoValida = true) {
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn().mockImplementation(async (datos: DatosMascota) => Mascota.reconstruir('mascota-1', datos)),
  };
  const almacenamientoImagenes: jest.Mocked<IAlmacenamientoImagenes> = {
    esUrlDeImagenValida: jest.fn().mockReturnValue(fotoValida),
  };
  return { repositorioMascotas, almacenamientoImagenes };
}

const comandoBase: ComandoRegistrarMascota = {
  dueñoId: 'dueno-1',
  nombre: 'Toby',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/toby.jpg',
};

describe('RegistrarMascota', () => {
  it('registra la mascota con los campos opcionales ausentes convertidos a null', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes();
    const caso = new RegistrarMascota(repositorioMascotas, almacenamientoImagenes);

    const resultado = await caso.ejecutar(comandoBase);

    expect(resultado).toEqual({
      id: 'mascota-1',
      dueñoId: 'dueno-1',
      nombre: 'Toby',
      especie: 'perro',
      fotoUrl: comandoBase.fotoUrl,
      raza: null,
      edadAproximada: null,
      identificacionChip: null,
    });
  });

  it('registra la mascota con todos los campos opcionales completos', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes();
    const caso = new RegistrarMascota(repositorioMascotas, almacenamientoImagenes);

    const resultado = await caso.ejecutar({
      ...comandoBase,
      raza: 'Mestizo',
      edadAproximada: 4,
      identificacionChip: '900000000000001',
    });

    expect(resultado.raza).toBe('Mestizo');
    expect(resultado.edadAproximada).toBe(4);
    expect(resultado.identificacionChip).toBe('900000000000001');
  });

  it('rechaza el alta si la fotoUrl no pertenece a nuestra cuenta de Cloudinary, sin persistir nada', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes(false);
    const caso = new RegistrarMascota(repositorioMascotas, almacenamientoImagenes);

    await expect(caso.ejecutar(comandoBase)).rejects.toBeInstanceOf(FotoObligatoriaError);
    expect(repositorioMascotas.crear).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) un nombre vacío antes de autorizar o persistir', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes();
    const caso = new RegistrarMascota(repositorioMascotas, almacenamientoImagenes);

    await expect(caso.ejecutar({ ...comandoBase, nombre: '' })).rejects.toBeInstanceOf(ZodError);
    expect(almacenamientoImagenes.esUrlDeImagenValida).not.toHaveBeenCalled();
    expect(repositorioMascotas.crear).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) la ausencia de fotoUrl', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes();
    const caso = new RegistrarMascota(repositorioMascotas, almacenamientoImagenes);
    const sinFoto: Partial<ComandoRegistrarMascota> = { ...comandoBase };
    delete sinFoto.fotoUrl;

    await expect(caso.ejecutar(sinFoto as ComandoRegistrarMascota)).rejects.toBeInstanceOf(ZodError);
  });
});
