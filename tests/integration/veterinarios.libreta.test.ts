/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { AutorizacionLibretaPersistida, IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type {
  DatosEntradaLibreta,
  EntradaLibretaPersistida,
  IRepositorioEntradasLibreta,
  PaginaEntradasLibreta,
} from '@dominio/puertos/IRepositorioEntradasLibreta';
import type { CambiosMascota, IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { Mascota } from '@dominio/entidades/Mascota';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/turnos.reservar.test.ts).
import { POST } from '@app/api/veterinarios/libreta/route';

const veterinarioId = 'veterinario-1';
const mascotaId = '11111111-1111-4111-8111-111111111111';

class RepositorioAutorizacionesEnMemoria implements IRepositorioAutorizacionesLibreta {
  public autorizaciones: AutorizacionLibretaPersistida[] = [];

  async obtenerActual(mascotaIdConsultado: string, veterinarioIdConsultado: string): Promise<AutorizacionLibretaPersistida | null> {
    const propias = this.autorizaciones
      .filter((a) => a.mascotaId === mascotaIdConsultado && a.veterinarioId === veterinarioIdConsultado)
      .sort((a, b) => b.otorgadaEn.getTime() - a.otorgadaEn.getTime());
    return propias[0] ?? null;
  }

  async crear(): Promise<AutorizacionLibretaPersistida> {
    throw new Error('no usado en este test');
  }

  async revocar(): Promise<AutorizacionLibretaPersistida | null> {
    throw new Error('no usado en este test');
  }

  async listarPorMascota(): Promise<AutorizacionLibretaPersistida[]> {
    return [];
  }
}

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

  async listarPorMascota(mascotaId: string, pagina: number, porPagina: number): Promise<PaginaEntradasLibreta> {
    const propias = this.entradas.filter((e) => e.mascotaId === mascotaId);
    return { items: propias, total: propias.length, pagina, porPagina };
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

class RepositorioPerfilEnMemoria implements IRepositorioPerfil {
  public perfiles = new Map<string, ResumenPerfilPropio>();

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return this.perfiles.get(usuarioId) ?? null;
  }
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/veterinarios/libreta', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

const payloadValido = {
  mascotaId,
  tipo: 'vacuna',
  descripcion: 'Vacuna antirrábica aplicada, sin reacciones adversas.',
  fecha: '2026-09-08',
};

describe('POST /api/veterinarios/libreta (Registro de entrada en la libreta sanitaria)', () => {
  let repositorioAutorizaciones: RepositorioAutorizacionesEnMemoria;
  let repositorioEntradas: RepositorioEntradasEnMemoria;
  let repositorioMascotas: RepositorioMascotasEnMemoria;
  let repositorioPerfil: RepositorioPerfilEnMemoria;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioAutorizaciones = new RepositorioAutorizacionesEnMemoria();
    repositorioEntradas = new RepositorioEntradasEnMemoria();
    repositorioMascotas = new RepositorioMascotasEnMemoria();
    repositorioPerfil = new RepositorioPerfilEnMemoria();

    repositorioMascotas.mascotas = [
      Mascota.reconstruir(mascotaId, {
        dueñoId: 'dueno-1',
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      }),
    ];
    repositorioPerfil.perfiles.set(veterinarioId, {
      id: veterinarioId,
      email: 'vet@example.com',
      rol: 'veterinario',
      estadoVerificacion: 'verificado',
      verificadoEn: new Date('2026-01-01T00:00:00.000Z'),
    });

    container.reset();
    container.registerInstance<IRepositorioAutorizacionesLibreta>('IRepositorioAutorizacionesLibreta', repositorioAutorizaciones);
    container.registerInstance<IRepositorioEntradasLibreta>('IRepositorioEntradasLibreta', repositorioEntradas);
    container.registerInstance<IRepositorioMascotas>('IRepositorioMascotas', repositorioMascotas);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await POST(crearRequest(payloadValido));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('AC (verificación de autorización activa): registra la entrada cuando hay autorización vigente del dueño', async () => {
    autenticarComo(veterinarioId);
    repositorioAutorizaciones.autorizaciones = [
      { id: 'autorizacion-1', mascotaId, veterinarioId, otorgadaEn: new Date('2026-01-05T00:00:00.000Z'), revocadaEn: null },
    ];

    const respuesta = await POST(crearRequest(payloadValido));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.mascotaId).toBe(mascotaId);
    expect(cuerpo.tipo).toBe('vacuna');
    expect(repositorioEntradas.entradas).toHaveLength(1);
  });

  it('AC (verificación de autorización activa): rechaza con 403/PEA-VET-003 si el dueño nunca autorizó a este veterinario', async () => {
    autenticarComo(veterinarioId);

    const respuesta = await POST(crearRequest(payloadValido));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-VET-003');
    expect(repositorioEntradas.entradas).toHaveLength(0);
  });

  it('AC (verificación de autorización activa): rechaza con 403/PEA-VET-004 si la autorización fue revocada', async () => {
    autenticarComo(veterinarioId);
    repositorioAutorizaciones.autorizaciones = [
      {
        id: 'autorizacion-1',
        mascotaId,
        veterinarioId,
        otorgadaEn: new Date('2026-01-05T00:00:00.000Z'),
        revocadaEn: new Date('2026-02-01T00:00:00.000Z'),
      },
    ];

    const respuesta = await POST(crearRequest(payloadValido));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-VET-004');
    expect(repositorioEntradas.entradas).toHaveLength(0);
  });

  it('rechaza con 403/PEA-VET-007 si la matrícula del veterinario no está verificada', async () => {
    autenticarComo(veterinarioId);
    repositorioPerfil.perfiles.set(veterinarioId, {
      id: veterinarioId,
      email: 'vet@example.com',
      rol: 'veterinario',
      estadoVerificacion: 'pendiente',
      verificadoEn: null,
    });
    repositorioAutorizaciones.autorizaciones = [
      { id: 'autorizacion-1', mascotaId, veterinarioId, otorgadaEn: new Date('2026-01-05T00:00:00.000Z'), revocadaEn: null },
    ];

    const respuesta = await POST(crearRequest(payloadValido));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-VET-007');
  });

  it('rechaza con 404/PEA-VET-005 si la mascota no existe', async () => {
    autenticarComo(veterinarioId);

    const respuesta = await POST(crearRequest({ ...payloadValido, mascotaId: '99999999-9999-4999-8999-999999999999' }));

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-VET-005');
  });

  it('rechaza con 400/PEA-VET-006 un tipo de entrada fuera del enum soportado', async () => {
    autenticarComo(veterinarioId);
    repositorioAutorizaciones.autorizaciones = [
      { id: 'autorizacion-1', mascotaId, veterinarioId, otorgadaEn: new Date('2026-01-05T00:00:00.000Z'), revocadaEn: null },
    ];

    const respuesta = await POST(crearRequest({ ...payloadValido, tipo: 'cirugia' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-VET-006');
  });

  it('rechaza con 400 un payload sin descripción', async () => {
    autenticarComo(veterinarioId);

    const respuesta = await POST(crearRequest({ mascotaId, tipo: payloadValido.tipo, fecha: payloadValido.fecha }));

    expect(respuesta.status).toBe(400);
  });
});
