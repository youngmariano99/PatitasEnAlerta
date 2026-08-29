/**
 * @jest-environment node
 *
 * Paso 4 del ticket AUTH-02: registra dos veterinarios con la misma
 * matrícula/colegio_emisor y espera PEA-AUTH-006 (409) en el segundo.
 */
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IRepositorioVeterinarios, DatosNuevoVeterinario } from '@dominio/puertos/IRepositorioVeterinarios';
import type { IProveedorAutenticacion, CredencialesRegistro, UsuarioAutenticado } from '@dominio/puertos/IProveedorAutenticacion';
import { PerfilVeterinario } from '@dominio/entidades/PerfilVeterinario';
import { POST } from '@app/api/auth/registro/route';

class RepositorioUsuariosFalso implements IRepositorioUsuarios {
  private readonly emails = new Set<string>();

  async existePorEmailActivo(email: string): Promise<boolean> {
    return this.emails.has(email);
  }

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  registrarEmail(email: string): void {
    this.emails.add(email);
  }
}

class RepositorioVeterinariosFalso implements IRepositorioVeterinarios {
  private readonly matriculasRegistradas = new Set<string>();

  async crear(datos: DatosNuevoVeterinario): Promise<PerfilVeterinario> {
    const clave = `${datos.matricula}::${datos.colegioEmisor}`;
    if (this.matriculasRegistradas.has(clave)) {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed on matricula, colegioEmisor', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });
    }
    this.matriculasRegistradas.add(clave);
    return PerfilVeterinario.reconstruir(datos.id, {
      email: datos.email,
      matricula: datos.matricula,
      colegioEmisor: datos.colegioEmisor,
      estadoVerificacion: 'pendiente',
    });
  }
}

class ProveedorAutenticacionFalso implements IProveedorAutenticacion {
  private contador = 0;

  async registrarCredenciales(datos: CredencialesRegistro): Promise<UsuarioAutenticado> {
    this.contador += 1;
    return { id: `vet-auth-${this.contador}`, email: datos.email };
  }

  async eliminarCredenciales(): Promise<void> {
    // no-op: nada que revertir en el fake.
  }

  async solicitarRecuperacionPassword(): Promise<void> {
    // no usado en este test
  }
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const datosMatricula = {
  matricula: 'MP-1001',
  colegioEmisor: 'Colegio de Veterinarios de la Provincia de Buenos Aires',
  password: 'contraseñaSegura123',
};

describe('POST /api/auth/registro — veterinario (AUTH-02)', () => {
  beforeEach(() => {
    container.reset();
    container.registerSingleton<IRepositorioUsuarios>('IRepositorioUsuarios', RepositorioUsuariosFalso);
    container.registerSingleton<IRepositorioVeterinarios>('IRepositorioVeterinarios', RepositorioVeterinariosFalso);
    container.registerSingleton<IProveedorAutenticacion>('IProveedorAutenticacion', ProveedorAutenticacionFalso);
  });

  it('registra al primer veterinario (201) y rechaza al segundo con la misma matrícula/colegio (409 / PEA-AUTH-006)', async () => {
    const primeraRespuesta = await POST(
      crearRequest({ ...datosMatricula, email: 'vet1@ejemplo.test', rol: 'veterinario' }),
    );
    expect(primeraRespuesta.status).toBe(201);
    const primerCuerpo = await primeraRespuesta.json();
    expect(primerCuerpo).toMatchObject({ email: 'vet1@ejemplo.test', estadoVerificacion: 'pendiente' });

    const segundaRespuesta = await POST(
      crearRequest({ ...datosMatricula, email: 'vet2@ejemplo.test', rol: 'veterinario' }),
    );
    expect(segundaRespuesta.status).toBe(409);
    const segundoCuerpo = await segundaRespuesta.json();
    expect(segundoCuerpo.codigo).toBe('PEA-AUTH-006');
    expect(segundoCuerpo.mensaje).toContain('Ya existe una matrícula registrada');
  });

  it('rechaza sin matrícula ni colegio emisor (400, fail-fast) antes de tocar Supabase Auth', async () => {
    const respuesta = await POST(
      crearRequest({ email: 'vet3@ejemplo.test', password: 'contraseñaSegura123', rol: 'veterinario' }),
    );

    expect(respuesta.status).toBe(400);
  });

  it('un veterinario con email ya registrado como dueño recibe 409 / PEA-AUTH-001', async () => {
    container.reset();
    const repositorioUsuarios = new RepositorioUsuariosFalso();
    repositorioUsuarios.registrarEmail('compartido@ejemplo.test');
    container.registerInstance<IRepositorioUsuarios>('IRepositorioUsuarios', repositorioUsuarios);
    container.registerSingleton<IRepositorioVeterinarios>('IRepositorioVeterinarios', RepositorioVeterinariosFalso);
    container.registerSingleton<IProveedorAutenticacion>('IProveedorAutenticacion', ProveedorAutenticacionFalso);

    const respuesta = await POST(
      crearRequest({ ...datosMatricula, email: 'compartido@ejemplo.test', rol: 'veterinario' }),
    );

    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-AUTH-001');
  });
});
