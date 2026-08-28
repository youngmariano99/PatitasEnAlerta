/**
 * @jest-environment node
 *
 * Paso 4 del ticket AUTH-05: da de baja una mascota y confirma que
 * desaparece del listado propio pero persiste en la tabla (fake en memoria
 * que replica fielmente la semántica de soft delete de
 * PrismaMascotaRepositorio: nunca elimina la fila, solo marca deleted_at y
 * la excluye de toda lectura — ver ese archivo y su test dedicado para la
 * prueba de que Prisma nunca emite un DELETE físico).
 */
import { DarDeBajaMascota } from '@aplicacion/casos-de-uso/mascotas/DarDeBajaMascota';
import { ActualizarMascota } from '@aplicacion/casos-de-uso/mascotas/ActualizarMascota';
import type { CambiosMascota, IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { DatosMascota } from '@dominio/entidades/Mascota';
import { Mascota } from '@dominio/entidades/Mascota';
import { MascotaNoEncontradaError } from '@dominio/errores/erroresMascotas';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

interface FilaEnMemoria extends DatosMascota {
  id: string;
  deletedAt: Date | null;
}

class RepositorioMascotasEnMemoria implements IRepositorioMascotas {
  private readonly filas = new Map<string, FilaEnMemoria>();

  async crear(datos: DatosMascota): Promise<Mascota> {
    // Los ids reales son UUID (gen_random_uuid() en Postgres); DarDeBajaMascota
    // valida el formato, así que el fake tiene que generarlos igual.
    const id = crypto.randomUUID();
    this.filas.set(id, { id, ...datos, deletedAt: null });
    return Mascota.reconstruir(id, datos);
  }

  async buscarPorId(id: string): Promise<Mascota | null> {
    const fila = this.filas.get(id);
    if (!fila || fila.deletedAt !== null) return null;
    return Mascota.reconstruir(fila.id, fila);
  }

  async listarPorDueño(dueñoId: string): Promise<Mascota[]> {
    return [...this.filas.values()]
      .filter((fila) => fila.dueñoId === dueñoId && fila.deletedAt === null)
      .map((fila) => Mascota.reconstruir(fila.id, fila));
  }

  async actualizar(id: string, cambios: CambiosMascota): Promise<Mascota> {
    const fila = this.filas.get(id);
    if (!fila) throw new Error('fila inexistente en el fake');
    // Igual que Prisma: una clave en `undefined` significa "no tocar este
    // campo", nunca "poné null" — filtrarlas antes de mezclar con la fila.
    const cambiosProvistos = Object.fromEntries(
      Object.entries(cambios).filter(([, valor]) => valor !== undefined),
    );
    const actualizada: FilaEnMemoria = { ...fila, ...cambiosProvistos };
    this.filas.set(id, actualizada);
    return Mascota.reconstruir(id, actualizada);
  }

  async darDeBaja(id: string): Promise<void> {
    const fila = this.filas.get(id);
    if (!fila) throw new Error('fila inexistente en el fake');
    // Igual que PrismaMascotaRepositorio: NUNCA this.filas.delete(id).
    this.filas.set(id, { ...fila, deletedAt: new Date() });
  }

  /** Solo para el test: acceso directo a la "tabla", ignorando deleted_at. */
  filaCruda(id: string): FilaEnMemoria | undefined {
    return this.filas.get(id);
  }
}

class AlmacenamientoImagenesSiempreValido implements IAlmacenamientoImagenes {
  esUrlDeImagenValida(): boolean {
    return true;
  }
}

const DUEÑO_A = '11111111-1111-4111-8111-111111111111';
const DUEÑO_B = '22222222-2222-4222-8222-222222222222';

describe('Edición y baja lógica de mascotas propias (AUTH-05)', () => {
  let repositorioMascotas: RepositorioMascotasEnMemoria;

  beforeEach(() => {
    repositorioMascotas = new RepositorioMascotasEnMemoria();
  });

  it('al dar de baja: desaparece del listado propio pero la fila persiste con deleted_at seteado (nunca DELETE físico)', async () => {
    const mascota = await repositorioMascotas.crear({
      dueñoId: DUEÑO_A,
      nombre: 'Toby',
      especie: 'perro',
      fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
      raza: null,
      edadAproximada: null,
      identificacionChip: null,
    });

    await expect(repositorioMascotas.listarPorDueño(DUEÑO_A)).resolves.toHaveLength(1);

    const casoBaja = new DarDeBajaMascota(repositorioMascotas);
    const resultado = await casoBaja.ejecutar({ id: mascota.id, dueñoIdSolicitante: DUEÑO_A });
    expect(resultado).toEqual({ id: mascota.id });

    const listadoTrasBaja = await repositorioMascotas.listarPorDueño(DUEÑO_A);
    expect(listadoTrasBaja).toHaveLength(0);

    const filaCruda = repositorioMascotas.filaCruda(mascota.id);
    expect(filaCruda).toBeDefined();
    expect(filaCruda?.deletedAt).toBeInstanceOf(Date);
    expect(filaCruda?.nombre).toBe('Toby');
  });

  it('rechaza la baja con 403 (PEA-SIS-002) si la pide un usuario distinto al dueño', async () => {
    const mascota = await repositorioMascotas.crear({
      dueñoId: DUEÑO_A,
      nombre: 'Luna',
      especie: 'gata',
      fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/luna.jpg',
      raza: null,
      edadAproximada: null,
      identificacionChip: null,
    });

    const casoBaja = new DarDeBajaMascota(repositorioMascotas);
    await expect(casoBaja.ejecutar({ id: mascota.id, dueñoIdSolicitante: DUEÑO_B })).rejects.toBeInstanceOf(
      AccesoNoAutorizadoError,
    );

    await expect(repositorioMascotas.listarPorDueño(DUEÑO_A)).resolves.toHaveLength(1);
  });

  it('no permite dar de baja dos veces la misma mascota (la segunda vez ya no la "encuentra")', async () => {
    const mascota = await repositorioMascotas.crear({
      dueñoId: DUEÑO_A,
      nombre: 'Rocky',
      especie: 'perro',
      fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/rocky.jpg',
      raza: null,
      edadAproximada: null,
      identificacionChip: null,
    });
    const casoBaja = new DarDeBajaMascota(repositorioMascotas);
    await casoBaja.ejecutar({ id: mascota.id, dueñoIdSolicitante: DUEÑO_A });

    await expect(casoBaja.ejecutar({ id: mascota.id, dueñoIdSolicitante: DUEÑO_A })).rejects.toBeInstanceOf(
      MascotaNoEncontradaError,
    );
  });

  it('edita una mascota propia sin alterar dueño_id, y la baja posterior la excluye igual del listado', async () => {
    const almacenamientoImagenes = new AlmacenamientoImagenesSiempreValido();
    const mascota = await repositorioMascotas.crear({
      dueñoId: DUEÑO_A,
      nombre: 'Nina',
      especie: 'perro',
      fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/nina.jpg',
      raza: null,
      edadAproximada: null,
      identificacionChip: null,
    });

    const casoActualizar = new ActualizarMascota(repositorioMascotas, almacenamientoImagenes);
    const actualizada = await casoActualizar.ejecutar({
      id: mascota.id,
      dueñoIdSolicitante: DUEÑO_A,
      raza: 'Mestiza',
      edadAproximada: 2,
    });

    expect(actualizada.dueñoId).toBe(DUEÑO_A);
    expect(actualizada.raza).toBe('Mestiza');
    expect(actualizada.edadAproximada).toBe(2);
    expect(actualizada.nombre).toBe('Nina');

    const casoBaja = new DarDeBajaMascota(repositorioMascotas);
    await casoBaja.ejecutar({ id: mascota.id, dueñoIdSolicitante: DUEÑO_A });

    await expect(repositorioMascotas.listarPorDueño(DUEÑO_A)).resolves.toHaveLength(0);
    expect(repositorioMascotas.filaCruda(mascota.id)?.raza).toBe('Mestiza');
  });
});
