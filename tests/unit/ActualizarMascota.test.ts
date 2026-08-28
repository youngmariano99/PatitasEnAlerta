/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ActualizarMascota } from '@aplicacion/casos-de-uso/mascotas/ActualizarMascota';
import type { ComandoActualizarMascota } from '@aplicacion/dtos/mascotas/ActualizarMascotaDto';
import type { IRepositorioMascotas, CambiosMascota } from '@dominio/puertos/IRepositorioMascotas';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import { Mascota } from '@dominio/entidades/Mascota';
import { MascotaNoEncontradaError, FotoObligatoriaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';

const mascotaExistente = Mascota.reconstruir('mascota-1', {
  dueñoId: 'dueno-1',
  nombre: 'Toby',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
  raza: null,
  edadAproximada: null,
  identificacionChip: null,
});

function crearFakes(opciones?: { mascota?: Mascota | null; fotoValida?: boolean }) {
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn(),
    buscarPorId: jest.fn().mockResolvedValue(opciones?.mascota === undefined ? mascotaExistente : opciones.mascota),
    listarPorDueño: jest.fn(),
    actualizar: jest
      .fn()
      .mockImplementation(async (_id: string, cambios: CambiosMascota) =>
        Mascota.reconstruir('mascota-1', { ...mascotaExistente, ...cambios }),
      ),
    darDeBaja: jest.fn(),
  };
  const almacenamientoImagenes: jest.Mocked<IAlmacenamientoImagenes> = {
    esUrlDeImagenValida: jest.fn().mockReturnValue(opciones?.fotoValida ?? true),
  };
  return { repositorioMascotas, almacenamientoImagenes };
}

const comandoBase: ComandoActualizarMascota = {
  id: 'mascota-1',
  dueñoIdSolicitante: 'dueno-1',
  nombre: 'Tobías',
};

describe('ActualizarMascota', () => {
  it('actualiza solo los campos provistos sin tocar created_at ni dueñoId (no forman parte del comando)', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes();
    const caso = new ActualizarMascota(repositorioMascotas, almacenamientoImagenes);

    const resultado = await caso.ejecutar(comandoBase);

    expect(repositorioMascotas.actualizar).toHaveBeenCalledWith('mascota-1', {
      nombre: 'Tobías',
      especie: undefined,
      fotoUrl: undefined,
      raza: undefined,
      edadAproximada: undefined,
      identificacionChip: undefined,
    });
    expect(resultado.nombre).toBe('Tobías');
    expect(resultado.dueñoId).toBe('dueno-1');
  });

  it('rechaza fail-fast un payload sin ningún campo para actualizar', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes();
    const caso = new ActualizarMascota(repositorioMascotas, almacenamientoImagenes);

    await expect(caso.ejecutar({ id: 'mascota-1', dueñoIdSolicitante: 'dueno-1' })).rejects.toBeInstanceOf(
      PayloadInvalidoError,
    );
    expect(repositorioMascotas.buscarPorId).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) un nombre vacío', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes();
    const caso = new ActualizarMascota(repositorioMascotas, almacenamientoImagenes);

    await expect(caso.ejecutar({ ...comandoBase, nombre: '' })).rejects.toBeInstanceOf(ZodError);
  });

  it('rechaza con 404 si la mascota no existe o ya fue dada de baja', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes({ mascota: null });
    const caso = new ActualizarMascota(repositorioMascotas, almacenamientoImagenes);

    await expect(caso.ejecutar(comandoBase)).rejects.toBeInstanceOf(MascotaNoEncontradaError);
    expect(repositorioMascotas.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza con 403 si la mascota no pertenece a quien la edita', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes();
    const caso = new ActualizarMascota(repositorioMascotas, almacenamientoImagenes);

    await expect(
      caso.ejecutar({ ...comandoBase, dueñoIdSolicitante: 'otro-usuario' }),
    ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioMascotas.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza si la nueva fotoUrl no pertenece a nuestra cuenta de Cloudinary', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes({ fotoValida: false });
    const caso = new ActualizarMascota(repositorioMascotas, almacenamientoImagenes);

    await expect(
      caso.ejecutar({ ...comandoBase, fotoUrl: 'https://otra-cuenta.cloudinary.com/x.jpg' }),
    ).rejects.toBeInstanceOf(FotoObligatoriaError);
  });

  it('no valida la fotoUrl contra Cloudinary si no se está editando ese campo', async () => {
    const { repositorioMascotas, almacenamientoImagenes } = crearFakes({ fotoValida: false });
    const caso = new ActualizarMascota(repositorioMascotas, almacenamientoImagenes);

    await expect(caso.ejecutar(comandoBase)).resolves.toBeDefined();
    expect(almacenamientoImagenes.esUrlDeImagenValida).not.toHaveBeenCalled();
  });
});
