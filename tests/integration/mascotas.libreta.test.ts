/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  DatosEntradaLibreta,
  EntradaLibretaPersistida,
  IRepositorioEntradasLibreta,
  PaginaEntradasLibreta,
} from '@dominio/puertos/IRepositorioEntradasLibreta';
import type { CambiosMascota, IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { Mascota } from '@dominio/entidades/Mascota';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/mascotas.autorizaciones.test.ts).
import { GET } from '@app/api/mascotas/[id]/libreta/route';

const dueñoId = 'dueno-1';
const veterinarioId = '22222222-2222-4222-8222-222222222222';
const mascotaId = '11111111-1111-4111-8111-111111111111';

class RepositorioEntradasEnMemoria implements IRepositorioEntradasLibreta {
  public entradas: EntradaLibretaPersistida[] = [];

  async crear(mascotaIdCreada: string, veterinarioIdCreado: string, datos: DatosEntradaLibreta): Promise<EntradaLibretaPersistida> {
    const entrada: EntradaLibretaPersistida = {
      id: `entrada-${this.entradas.length + 1}`,
      mascotaId: mascotaIdCreada,
      veterinarioId: veterinarioIdCreado,
      ...datos,
      createdAt: new Date('2026-09-08T12:00:00.000Z'),
    };
    this.entradas.push(entrada);
    return entrada;
  }

  async listarPorMascota(mascotaIdConsultado: string, pagina: number, porPagina: number): Promise<PaginaEntradasLibreta> {
    const propias = this.entradas
      .filter((e) => e.mascotaId === mascotaIdConsultado)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const inicio = (pagina - 1) * porPagina;
    return { items: propias.slice(inicio, inicio + porPagina), total: propias.length, pagina, porPagina };
  }
}

class RepositorioMascotasEnMemoria implements IRepositorioMascotas {
  public mascotas: Mascota[] = [];

  async crear(): Promise<Mascota> {
    throw new Error('no usado en este test');
  }

  async buscarPorId(id: string): Promise<Mascota | null> {
    return this.mascotas.find((m) => m.id === id) ?? null;
  }

  async listarPorDueño(): Promise<Mascota[]> {
    return [];
  }

  async actualizar(id: string, _cambios: CambiosMascota): Promise<Mascota> {
    const existente = this.mascotas.find((m) => m.id === id);
    if (!existente) throw new Error('no encontrada');
    return existente;
  }

  async darDeBaja(): Promise<void> {}
}

function crearRequest(query?: string): NextRequest {
  return new NextRequest(`http://localhost/api/mascotas/${mascotaId}/libreta${query ?? ''}`, { method: 'GET' });
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

describe('GET /api/mascotas/[id]/libreta (Consulta del historial de la libreta sanitaria)', () => {
  let repositorioEntradas: RepositorioEntradasEnMemoria;
  let repositorioMascotas: RepositorioMascotasEnMemoria;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioEntradas = new RepositorioEntradasEnMemoria();
    repositorioMascotas = new RepositorioMascotasEnMemoria();

    repositorioMascotas.mascotas = [
      Mascota.reconstruir(mascotaId, {
        dueñoId,
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      }),
    ];

    container.reset();
    container.registerInstance<IRepositorioEntradasLibreta>('IRepositorioEntradasLibreta', repositorioEntradas);
    container.registerInstance<IRepositorioMascotas>('IRepositorioMascotas', repositorioMascotas);
  });

  it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await GET(crearRequest(), { params: { id: mascotaId } });

    expect(respuesta.status).toBe(401);
    expect((await respuesta.json()).codigo).toBe('PEA-SIS-001');
  });

  it('AC (historial cronológico): devuelve las entradas de la mascota propia, más reciente primero', async () => {
    autenticarComo(dueñoId);
    await repositorioEntradas.crear(mascotaId, veterinarioId, { tipo: 'vacuna', descripcion: 'Antirrábica', fecha: '2026-01-05' });
    await repositorioEntradas.crear(mascotaId, veterinarioId, { tipo: 'visita', descripcion: 'Control de rutina', fecha: '2026-03-01' });

    const respuesta = await GET(crearRequest(), { params: { id: mascotaId } });

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(2);
    expect(cuerpo.items[0].fecha).toBe('2026-03-01');
    expect(cuerpo.total).toBe(2);
    expect(cuerpo.pagina).toBe(1);
    expect(cuerpo.porPagina).toBe(50);
  });

  it('pagina el resultado respetando ?pagina&porPagina (tope 50)', async () => {
    autenticarComo(dueñoId);
    await repositorioEntradas.crear(mascotaId, veterinarioId, { tipo: 'vacuna', descripcion: 'Antirrábica', fecha: '2026-01-05' });
    await repositorioEntradas.crear(mascotaId, veterinarioId, { tipo: 'visita', descripcion: 'Control de rutina', fecha: '2026-03-01' });

    const respuesta = await GET(crearRequest('?pagina=2&porPagina=1'), { params: { id: mascotaId } });

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(1);
    expect(cuerpo.items[0].fecha).toBe('2026-01-05');
    expect(cuerpo.pagina).toBe(2);
    expect(cuerpo.porPagina).toBe(1);
  });

  it('rechaza con 404/PEA-AUTH-009 si la mascota no existe', async () => {
    autenticarComo(dueñoId);

    const respuesta = await GET(crearRequest(), { params: { id: '99999999-9999-4999-8999-999999999999' } });

    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).codigo).toBe('PEA-AUTH-009');
  });

  it('rechaza con 403/PEA-SIS-002 (anti-IDOR) si la mascota no pertenece a quien invoca', async () => {
    autenticarComo('otro-usuario');

    const respuesta = await GET(crearRequest(), { params: { id: mascotaId } });

    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).codigo).toBe('PEA-SIS-002');
  });
});
