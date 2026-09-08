/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { AutorizacionLibretaPersistida, IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { CambiosMascota, IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { Mascota } from '@dominio/entidades/Mascota';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' (mismo
// criterio que tests/integration/veterinarios.libreta.test.ts).
import { GET, POST } from '@app/api/mascotas/[id]/autorizaciones/route';
import { DELETE } from '@app/api/mascotas/[id]/autorizaciones/[veterinarioId]/route';

const dueñoId = 'dueno-1';
const veterinarioId = '22222222-2222-4222-8222-222222222222';
const mascotaId = '11111111-1111-4111-8111-111111111111';

let contadorAutorizaciones = 0;

class RepositorioAutorizacionesEnMemoria implements IRepositorioAutorizacionesLibreta {
  public autorizaciones: AutorizacionLibretaPersistida[] = [];

  async obtenerActual(mascotaIdConsultado: string, veterinarioIdConsultado: string): Promise<AutorizacionLibretaPersistida | null> {
    const propias = this.autorizaciones
      .filter((a) => a.mascotaId === mascotaIdConsultado && a.veterinarioId === veterinarioIdConsultado)
      .sort((a, b) => b.otorgadaEn.getTime() - a.otorgadaEn.getTime());
    return propias[0] ?? null;
  }

  async crear(mascotaIdCreada: string, veterinarioIdCreado: string): Promise<AutorizacionLibretaPersistida> {
    contadorAutorizaciones += 1;
    const autorizacion: AutorizacionLibretaPersistida = {
      id: `autorizacion-${contadorAutorizaciones}`,
      mascotaId: mascotaIdCreada,
      veterinarioId: veterinarioIdCreado,
      otorgadaEn: new Date('2026-09-08T12:00:00.000Z'),
      revocadaEn: null,
    };
    this.autorizaciones.push(autorizacion);
    return autorizacion;
  }

  async revocar(mascotaIdConsultado: string, veterinarioIdConsultado: string): Promise<AutorizacionLibretaPersistida | null> {
    const activa = await this.obtenerActual(mascotaIdConsultado, veterinarioIdConsultado);
    if (!activa || activa.revocadaEn) return null;
    activa.revocadaEn = new Date('2026-09-08T13:00:00.000Z');
    return activa;
  }

  async listarPorMascota(mascotaIdConsultado: string): Promise<AutorizacionLibretaPersistida[]> {
    return this.autorizaciones
      .filter((a) => a.mascotaId === mascotaIdConsultado)
      .sort((a, b) => b.otorgadaEn.getTime() - a.otorgadaEn.getTime());
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

function crearRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/mascotas/${mascotaId}/autorizaciones`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  });
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

describe('CRUD de autorizaciones_libreta controlado por el dueño', () => {
  let repositorioAutorizaciones: RepositorioAutorizacionesEnMemoria;
  let repositorioMascotas: RepositorioMascotasEnMemoria;
  let repositorioPerfil: RepositorioPerfilEnMemoria;

  beforeEach(() => {
    getUserMock.mockReset();
    contadorAutorizaciones = 0;
    repositorioAutorizaciones = new RepositorioAutorizacionesEnMemoria();
    repositorioMascotas = new RepositorioMascotasEnMemoria();
    repositorioPerfil = new RepositorioPerfilEnMemoria();

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
    repositorioPerfil.perfiles.set(veterinarioId, {
      id: veterinarioId,
      email: 'vet@example.com',
      rol: 'veterinario',
      estadoVerificacion: 'verificado',
      verificadoEn: new Date('2026-01-01T00:00:00.000Z'),
    });

    container.reset();
    container.registerInstance<IRepositorioAutorizacionesLibreta>('IRepositorioAutorizacionesLibreta', repositorioAutorizaciones);
    container.registerInstance<IRepositorioMascotas>('IRepositorioMascotas', repositorioMascotas);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  describe('POST /api/mascotas/[id]/autorizaciones', () => {
    it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
      autenticarComo(null);

      const respuesta = await POST(crearRequest('POST', { veterinarioId }), { params: { id: mascotaId } });

      expect(respuesta.status).toBe(401);
      expect((await respuesta.json()).codigo).toBe('PEA-SIS-001');
    });

    it('otorga la autorización (201) cuando el dueño autenticado es propietario de la mascota', async () => {
      autenticarComo(dueñoId);

      const respuesta = await POST(crearRequest('POST', { veterinarioId }), { params: { id: mascotaId } });

      expect(respuesta.status).toBe(201);
      const cuerpo = await respuesta.json();
      expect(cuerpo.mascotaId).toBe(mascotaId);
      expect(cuerpo.veterinarioId).toBe(veterinarioId);
      expect(cuerpo.revocadaEn).toBeNull();
    });

    it('rechaza con 403/PEA-SIS-002 (anti-IDOR) si la mascota no pertenece a quien invoca', async () => {
      autenticarComo('otro-usuario');

      const respuesta = await POST(crearRequest('POST', { veterinarioId }), { params: { id: mascotaId } });

      expect(respuesta.status).toBe(403);
      expect((await respuesta.json()).codigo).toBe('PEA-SIS-002');
    });

    it('rechaza con 404/PEA-VET-011 si el veterinarioId no corresponde a un usuario con rol veterinario', async () => {
      autenticarComo(dueñoId);

      const respuesta = await POST(crearRequest('POST', { veterinarioId: '99999999-9999-4999-8999-999999999999' }), {
        params: { id: mascotaId },
      });

      expect(respuesta.status).toBe(404);
      expect((await respuesta.json()).codigo).toBe('PEA-VET-011');
    });

    it('rechaza con 409/PEA-VET-009 si ya existe una autorización activa para ese veterinario', async () => {
      autenticarComo(dueñoId);
      await POST(crearRequest('POST', { veterinarioId }), { params: { id: mascotaId } });

      const respuesta = await POST(crearRequest('POST', { veterinarioId }), { params: { id: mascotaId } });

      expect(respuesta.status).toBe(409);
      expect((await respuesta.json()).codigo).toBe('PEA-VET-009');
    });
  });

  describe('GET /api/mascotas/[id]/autorizaciones', () => {
    it('devuelve el historial de autorizaciones de la mascota propia', async () => {
      autenticarComo(dueñoId);
      await POST(crearRequest('POST', { veterinarioId }), { params: { id: mascotaId } });

      const respuesta = await GET(crearRequest('GET'), { params: { id: mascotaId } });

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo).toHaveLength(1);
      expect(cuerpo[0].veterinarioId).toBe(veterinarioId);
    });

    it('rechaza con 403/PEA-SIS-002 si la mascota no pertenece a quien invoca', async () => {
      autenticarComo('otro-usuario');

      const respuesta = await GET(crearRequest('GET'), { params: { id: mascotaId } });

      expect(respuesta.status).toBe(403);
      expect((await respuesta.json()).codigo).toBe('PEA-SIS-002');
    });
  });

  describe('DELETE /api/mascotas/[id]/autorizaciones/[veterinarioId] (revocación)', () => {
    it('revoca la autorización activa (200) y deja de figurar como vigente', async () => {
      autenticarComo(dueñoId);
      await POST(crearRequest('POST', { veterinarioId }), { params: { id: mascotaId } });

      const respuesta = await DELETE(crearRequest('DELETE'), { params: { id: mascotaId, veterinarioId } });

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.revocadaEn).not.toBeNull();
    });

    it('rechaza con 404/PEA-VET-010 si no hay autorización activa para revocar', async () => {
      autenticarComo(dueñoId);

      const respuesta = await DELETE(crearRequest('DELETE'), { params: { id: mascotaId, veterinarioId } });

      expect(respuesta.status).toBe(404);
      expect((await respuesta.json()).codigo).toBe('PEA-VET-010');
    });

    it('rechaza con 403/PEA-SIS-002 (anti-IDOR) si la mascota no pertenece a quien invoca', async () => {
      autenticarComo(dueñoId);
      await POST(crearRequest('POST', { veterinarioId }), { params: { id: mascotaId } });
      autenticarComo('otro-usuario');

      const respuesta = await DELETE(crearRequest('DELETE'), { params: { id: mascotaId, veterinarioId } });

      expect(respuesta.status).toBe(403);
      expect((await respuesta.json()).codigo).toBe('PEA-SIS-002');
    });
  });
});
