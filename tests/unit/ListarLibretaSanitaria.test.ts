/**
 * @jest-environment node
 */
import { ListarLibretaSanitaria } from '@aplicacion/casos-de-uso/veterinarios/ListarLibretaSanitaria';
import type { EntradaLibretaPersistida, IRepositorioEntradasLibreta } from '@dominio/puertos/IRepositorioEntradasLibreta';
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

const entradas: EntradaLibretaPersistida[] = [
  {
    id: 'entrada-2',
    mascotaId,
    veterinarioId,
    tipo: 'visita',
    descripcion: 'Control de rutina, todo bien.',
    fecha: '2026-03-01',
    createdAt: new Date('2026-03-01T12:00:00.000Z'),
  },
  {
    id: 'entrada-1',
    mascotaId,
    veterinarioId,
    tipo: 'vacuna',
    descripcion: 'Vacuna antirrábica aplicada.',
    fecha: '2026-01-05',
    createdAt: new Date('2026-01-05T12:00:00.000Z'),
  },
];

function crearFakes(opciones?: { mascotaEncontrada?: Mascota | null }) {
  const repositorioEntradas: jest.Mocked<IRepositorioEntradasLibreta> = {
    crear: jest.fn(),
    listarPorMascota: jest.fn().mockResolvedValue({ items: entradas, total: entradas.length, pagina: 1, porPagina: 50 }),
  };
  const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
    crear: jest.fn(),
    buscarPorId: jest.fn().mockResolvedValue(opciones?.mascotaEncontrada === undefined ? mascota : opciones.mascotaEncontrada),
    listarPorDueño: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
  };
  return { repositorioEntradas, repositorioMascotas };
}

describe('ListarLibretaSanitaria', () => {
  it('devuelve el historial cronológico paginado cuando la mascota pertenece a quien invoca', async () => {
    const fakes = crearFakes();
    const caso = new ListarLibretaSanitaria(fakes.repositorioEntradas, fakes.repositorioMascotas);

    const resultado = await caso.ejecutar({ mascotaId, dueñoId, pagina: 1, porPagina: 50 });

    expect(fakes.repositorioEntradas.listarPorMascota).toHaveBeenCalledWith(mascotaId, 1, 50);
    expect(resultado.items).toHaveLength(2);
    expect(resultado.items[0]?.id).toBe('entrada-2');
    expect(resultado.items[0]?.createdAt).toBe('2026-03-01T12:00:00.000Z');
    expect(resultado.total).toBe(2);
  });

  it('clampea página/porPágina fuera de rango (tope 50, mismo criterio que ListarTurnosVeterinario)', async () => {
    const fakes = crearFakes();
    const caso = new ListarLibretaSanitaria(fakes.repositorioEntradas, fakes.repositorioMascotas);

    await caso.ejecutar({ mascotaId, dueñoId, pagina: 0, porPagina: 500 });

    expect(fakes.repositorioEntradas.listarPorMascota).toHaveBeenCalledWith(mascotaId, 1, 50);
  });

  it('rechaza con 404/PEA-AUTH-009 si la mascota no existe', async () => {
    const fakes = crearFakes({ mascotaEncontrada: null });
    const caso = new ListarLibretaSanitaria(fakes.repositorioEntradas, fakes.repositorioMascotas);

    await expect(caso.ejecutar({ mascotaId, dueñoId, pagina: 1, porPagina: 50 })).rejects.toBeInstanceOf(MascotaNoEncontradaError);
    expect(fakes.repositorioEntradas.listarPorMascota).not.toHaveBeenCalled();
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
    const caso = new ListarLibretaSanitaria(fakes.repositorioEntradas, fakes.repositorioMascotas);

    await expect(caso.ejecutar({ mascotaId, dueñoId, pagina: 1, porPagina: 50 })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
  });
});
