/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type {
  IProveedorAutenticacion,
  CredencialesRegistro,
  UsuarioAutenticado,
} from '@dominio/puertos/IProveedorAutenticacion';
import { Usuario } from '@dominio/entidades/Usuario';
import { POST } from '@app/api/auth/registro/route';

/**
 * Fakes en memoria de los dos puertos (Repositorio + Proveedor de
 * Autenticación) — sin esto el test dependería de una BD real y de un
 * proyecto Supabase real, algo que ni CI ni el entorno local garantizan.
 * Se registran como singleton para persistir estado entre los dos POST del
 * mismo test (simula la fila real que ya quedó en `usuarios`).
 */
class RepositorioUsuariosFalso implements IRepositorioUsuarios {
  private readonly emailsRegistrados = new Set<string>();

  async existePorEmailActivo(email: string): Promise<boolean> {
    return this.emailsRegistrados.has(email);
  }

  async crear(usuario: Usuario): Promise<Usuario> {
    this.emailsRegistrados.add(usuario.email);
    return usuario;
  }
}

class ProveedorAutenticacionFalso implements IProveedorAutenticacion {
  private contador = 0;

  async registrarCredenciales(datos: CredencialesRegistro): Promise<UsuarioAutenticado> {
    if (datos.email === 'servicio-caido@ejemplo.test') {
      // Simula una falla no controlada (ej. Supabase Auth inaccesible) para
      // ejercitar el catch genérico -> 500 / PEA-SIS-003 del route handler.
      throw new Error('Supabase Auth no responde');
    }
    this.contador += 1;
    return { id: `00000000-0000-0000-0000-0000000000${String(this.contador).padStart(2, '0')}`, email: datos.email };
  }

  async eliminarCredenciales(): Promise<void> {
    // no-op: nada que revertir en el fake.
  }
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/registro (AUTH-01)', () => {
  beforeEach(() => {
    container.reset();
    container.registerSingleton<IRepositorioUsuarios>('IRepositorioUsuarios', RepositorioUsuariosFalso);
    container.registerSingleton<IProveedorAutenticacion>('IProveedorAutenticacion', ProveedorAutenticacionFalso);
  });

  it('registra un dueño nuevo con 201 y rechaza un segundo registro con el mismo email (409 / PEA-AUTH-001)', async () => {
    // Nota: el patrón de seed "dueño{n}@ejemplo.test" (docs/SEED.md) usa 'ñ'
    // en la parte local del email, que el validador estándar de Zod rechaza
    // como formato inválido (RFC 5321, sin extensión SMTPUTF8). Ese patrón
    // solo se inserta directo por SQL (bypassa esta validación a propósito,
    // ver docs/SEED.md); acá se usa un email ASCII real para probar el
    // camino de negocio (alta + duplicado), no el detalle de formato.
    const datos = { email: 'dueno1@ejemplo.test', password: 'contraseñaSegura123' };

    const primeraRespuesta = await POST(crearRequest(datos));
    expect(primeraRespuesta.status).toBe(201);
    const primerCuerpo = await primeraRespuesta.json();
    expect(primerCuerpo).toMatchObject({ email: datos.email, rolId: 1 });

    const segundaRespuesta = await POST(crearRequest(datos));
    expect(segundaRespuesta.status).toBe(409);
    const segundoCuerpo = await segundaRespuesta.json();
    expect(segundoCuerpo.codigo).toBe('PEA-AUTH-001');
    expect(segundoCuerpo.mensaje).toContain('Ya existe una cuenta con ese email');
  });

  it('rechaza un email con formato inválido antes de tocar el repositorio (400, fail-fast)', async () => {
    const respuesta = await POST(
      crearRequest({ email: 'no-es-un-email', password: 'contraseñaSegura123' }),
    );

    expect(respuesta.status).toBe(400);
  });

  it('rechaza una contraseña demasiado corta sin crear credenciales en el proveedor de autenticación', async () => {
    const respuesta = await POST(
      crearRequest({ email: 'dueno2@ejemplo.test', password: '123' }),
    );

    expect(respuesta.status).toBe(400);

    const repositorio = container.resolve<IRepositorioUsuarios>('IRepositorioUsuarios');
    await expect(repositorio.existePorEmailActivo('dueno2@ejemplo.test')).resolves.toBe(false);
  });

  it('rechaza un body que no es JSON válido con 400 antes de resolver el caso de uso', async () => {
    const request = new NextRequest('http://localhost/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'esto no es json{',
    });

    const respuesta = await POST(request);
    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });

  it('devuelve 500 / PEA-SIS-003 ante un error no controlado, sin exponer el detalle interno', async () => {
    const respuesta = await POST(
      crearRequest({ email: 'servicio-caido@ejemplo.test', password: 'contraseñaSegura123' }),
    );

    expect(respuesta.status).toBe(500);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-003');
    expect(cuerpo.mensaje).not.toContain('Supabase Auth no responde');
  });
});
