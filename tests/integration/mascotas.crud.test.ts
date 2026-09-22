/**
 * @jest-environment node
 *
 * Cierra el gap de docs/AUDITORIA_SISTEMA.md Sección 2: ActualizarMascota y
 * DarDeBajaMascota tenían caso de uso y tests, pero nunca se les creó el
 * route.ts. Estos tests cubren los 4 endpoints nuevos/completados:
 * GET /api/mascotas, GET/PATCH/DELETE /api/mascotas/[id].
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { CambiosMascota, IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { DatosMascota } from '@dominio/entidades/Mascota';
import { Mascota } from '@dominio/entidades/Mascota';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' (Jest
// hoistea jest.mock, así que el orden de imports acá abajo no afecta el mockeo).
import { GET as GET_LISTADO } from '@app/api/mascotas/route';
import { GET as GET_DETALLE, PATCH, DELETE } from '@app/api/mascotas/[id]/route';

interface FilaEnMemoria extends DatosMascota {
  id: string;
  deletedAt: Date | null;
}

class RepositorioMascotasEnMemoria implements IRepositorioMascotas {
  private readonly filas = new Map<string, FilaEnMemoria>();

  async crear(datos: DatosMascota): Promise<Mascota> {
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
    this.filas.set(id, { ...fila, deletedAt: new Date() });
  }
}

class AlmacenamientoImagenesFalso implements IAlmacenamientoImagenes {
  esUrlDeImagenValida(url: string): boolean {
    return url.startsWith('https://res.cloudinary.com/patitas-en-alerta/');
  }

  async fueSubidaPor(): Promise<boolean> {
    return true;
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId
      ? { data: { user: { id: usuarioId } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(url: string, metodo: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method: metodo,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const DUEÑO_A = '11111111-1111-4111-8111-111111111111';
const DUEÑO_B = '22222222-2222-4222-8222-222222222222';
const fotoValida = 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/toby.jpg';

describe('CRUD de mascotas propias vía HTTP (GET listado/detalle, PATCH, DELETE)', () => {
  let repositorioMascotas: RepositorioMascotasEnMemoria;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioMascotas = new RepositorioMascotasEnMemoria();
    container.reset();
    container.registerInstance<IRepositorioMascotas>('IRepositorioMascotas', repositorioMascotas);
    container.registerSingleton<IAlmacenamientoImagenes>(
      'IAlmacenamientoImagenes',
      AlmacenamientoImagenesFalso,
    );
  });

  describe('GET /api/mascotas', () => {
    it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
      autenticarComo(null);

      const respuesta = await GET_LISTADO(crearRequest('http://localhost/api/mascotas', 'GET'));

      expect(respuesta.status).toBe(401);
    });

    it('devuelve únicamente las mascotas del dueño autenticado', async () => {
      await repositorioMascotas.crear({
        dueñoId: DUEÑO_A,
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: fotoValida,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      });
      await repositorioMascotas.crear({
        dueñoId: DUEÑO_B,
        nombre: 'Luna',
        especie: 'gata',
        fotoUrl: fotoValida,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      });
      autenticarComo(DUEÑO_A);

      const respuesta = await GET_LISTADO(crearRequest('http://localhost/api/mascotas', 'GET'));
      const cuerpo = await respuesta.json();

      expect(respuesta.status).toBe(200);
      expect(cuerpo).toHaveLength(1);
      expect(cuerpo[0].nombre).toBe('Toby');
    });
  });

  describe('GET /api/mascotas/[id]', () => {
    it('devuelve la ficha cuando la mascota es propia', async () => {
      const mascota = await repositorioMascotas.crear({
        dueñoId: DUEÑO_A,
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: fotoValida,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      });
      autenticarComo(DUEÑO_A);

      const respuesta = await GET_DETALLE(
        crearRequest(`http://localhost/api/mascotas/${mascota.id}`, 'GET'),
        {
          params: { id: mascota.id },
        },
      );
      const cuerpo = await respuesta.json();

      expect(respuesta.status).toBe(200);
      expect(cuerpo.nombre).toBe('Toby');
    });

    it('responde 403 (PEA-SIS-002) si la mascota es de otro dueño', async () => {
      const mascota = await repositorioMascotas.crear({
        dueñoId: DUEÑO_A,
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: fotoValida,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      });
      autenticarComo(DUEÑO_B);

      const respuesta = await GET_DETALLE(
        crearRequest(`http://localhost/api/mascotas/${mascota.id}`, 'GET'),
        {
          params: { id: mascota.id },
        },
      );

      expect(respuesta.status).toBe(403);
    });
  });

  describe('PATCH /api/mascotas/[id]', () => {
    it('actualiza los campos provistos de una mascota propia', async () => {
      const mascota = await repositorioMascotas.crear({
        dueñoId: DUEÑO_A,
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: fotoValida,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      });
      autenticarComo(DUEÑO_A);

      const respuesta = await PATCH(
        crearRequest(`http://localhost/api/mascotas/${mascota.id}`, 'PATCH', {
          raza: 'Mestizo',
          edadAproximada: 4,
        }),
        { params: { id: mascota.id } },
      );
      const cuerpo = await respuesta.json();

      expect(respuesta.status).toBe(200);
      expect(cuerpo.raza).toBe('Mestizo');
      expect(cuerpo.edadAproximada).toBe(4);
      expect(cuerpo.dueñoId).toBe(DUEÑO_A);
    });

    it('rechaza editar una mascota ajena (403 / PEA-SIS-002)', async () => {
      const mascota = await repositorioMascotas.crear({
        dueñoId: DUEÑO_A,
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: fotoValida,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      });
      autenticarComo(DUEÑO_B);

      const respuesta = await PATCH(
        crearRequest(`http://localhost/api/mascotas/${mascota.id}`, 'PATCH', { raza: 'Mestizo' }),
        { params: { id: mascota.id } },
      );

      expect(respuesta.status).toBe(403);
    });
  });

  describe('DELETE /api/mascotas/[id]', () => {
    it('da de baja (soft delete) una mascota propia', async () => {
      const mascota = await repositorioMascotas.crear({
        dueñoId: DUEÑO_A,
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: fotoValida,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      });
      autenticarComo(DUEÑO_A);

      const respuesta = await DELETE(
        crearRequest(`http://localhost/api/mascotas/${mascota.id}`, 'DELETE'),
        {
          params: { id: mascota.id },
        },
      );

      expect(respuesta.status).toBe(200);
      await expect(repositorioMascotas.listarPorDueño(DUEÑO_A)).resolves.toHaveLength(0);
    });

    it('rechaza dar de baja una mascota ajena (403 / PEA-SIS-002)', async () => {
      const mascota = await repositorioMascotas.crear({
        dueñoId: DUEÑO_A,
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: fotoValida,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      });
      autenticarComo(DUEÑO_B);

      const respuesta = await DELETE(
        crearRequest(`http://localhost/api/mascotas/${mascota.id}`, 'DELETE'),
        {
          params: { id: mascota.id },
        },
      );

      expect(respuesta.status).toBe(403);
      await expect(repositorioMascotas.listarPorDueño(DUEÑO_A)).resolves.toHaveLength(1);
    });
  });
});
