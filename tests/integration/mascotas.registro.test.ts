/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { DatosMascota } from '@dominio/entidades/Mascota';
import { Mascota } from '@dominio/entidades/Mascota';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest hoistea
// jest.mock, así que el orden de imports acá abajo no afecta el mockeo real.
import { POST } from '@app/api/mascotas/route';

class RepositorioMascotasFalso implements IRepositorioMascotas {
  public creadas: DatosMascota[] = [];

  async crear(datos: DatosMascota): Promise<Mascota> {
    this.creadas.push(datos);
    return Mascota.reconstruir(`mascota-${this.creadas.length}`, datos);
  }

  async buscarPorId(): Promise<Mascota | null> {
    return null;
  }

  async listarPorDueño(): Promise<Mascota[]> {
    return [];
  }

  async actualizar(): Promise<Mascota> {
    throw new Error('no usado en este test');
  }

  async darDeBaja(): Promise<void> {
    // no usado en este test
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
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mascotas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fotoValida = 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/toby.jpg';

describe('POST /api/mascotas (AUTH-04)', () => {
  let repositorioMascotas: RepositorioMascotasFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioMascotas = new RepositorioMascotasFalso();
    container.reset();
    container.registerInstance<IRepositorioMascotas>('IRepositorioMascotas', repositorioMascotas);
    container.registerSingleton<IAlmacenamientoImagenes>('IAlmacenamientoImagenes', AlmacenamientoImagenesFalso);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001), sin persistir nada', async () => {
    autenticarComo(null);

    const respuesta = await POST(crearRequest({ nombre: 'Toby', especie: 'perro', fotoUrl: fotoValida }));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
    expect(repositorioMascotas.creadas).toHaveLength(0);
  });

  it('rechaza sin fotoUrl (400 / PEA-AUTH-010)', async () => {
    autenticarComo('dueno-1');

    const respuesta = await POST(crearRequest({ nombre: 'Toby', especie: 'perro' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-AUTH-010');
    expect(repositorioMascotas.creadas).toHaveLength(0);
  });

  it('rechaza un dueñoId declarado distinto al usuario autenticado (403 / PEA-SIS-002)', async () => {
    autenticarComo('dueno-1');

    const respuesta = await POST(
      crearRequest({ nombre: 'Toby', especie: 'perro', fotoUrl: fotoValida, dueñoId: 'dueno-2-otro-usuario' }),
    );

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
    expect(repositorioMascotas.creadas).toHaveLength(0);
  });

  it('registra con éxito y persiste dueñoId = usuario autenticado, con los opcionales ausentes', async () => {
    autenticarComo('dueno-1');

    const respuesta = await POST(crearRequest({ nombre: 'Toby', especie: 'perro', fotoUrl: fotoValida }));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.dueñoId).toBe('dueno-1');
    expect(cuerpo.raza).toBeNull();
    expect(cuerpo.edadAproximada).toBeNull();
    expect(cuerpo.identificacionChip).toBeNull();
    expect(repositorioMascotas.creadas).toEqual([
      {
        dueñoId: 'dueno-1',
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: fotoValida,
        raza: null,
        edadAproximada: null,
        identificacionChip: null,
      },
    ]);
  });

  it('registra con éxito cuando el dueñoId declarado coincide con el usuario autenticado', async () => {
    autenticarComo('dueno-1');

    const respuesta = await POST(
      crearRequest({ nombre: 'Toby', especie: 'perro', fotoUrl: fotoValida, dueñoId: 'dueno-1' }),
    );

    expect(respuesta.status).toBe(201);
  });

  it('rechaza una fotoUrl que no pertenece a nuestra cuenta de Cloudinary (400 / PEA-AUTH-010)', async () => {
    autenticarComo('dueno-1');

    const respuesta = await POST(
      crearRequest({ nombre: 'Toby', especie: 'perro', fotoUrl: 'https://otra-cuenta.cloudinary.com/x.jpg' }),
    );

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-AUTH-010');
  });
});
