/**
 * @jest-environment node
 *
 * Paso 4 del ticket AUTH-03: intenta crear una cuenta Municipio con un rol
 * distinto de administrador y espera PEA-AUTH-011 (403). Verificación
 * técnica del ticket: cubre explícitamente dueño, veterinario y rescatista.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IRepositorioMunicipios, DatosNuevoMunicipio } from '@dominio/puertos/IRepositorioMunicipios';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type {
  IProveedorAutenticacion,
  CredencialesRegistro,
  UsuarioAutenticado,
} from '@dominio/puertos/IProveedorAutenticacion';
import { PerfilMunicipio } from '@dominio/entidades/PerfilMunicipio';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { POST } from '@app/api/admin/municipio/route';

class RepositorioPerfilFalso implements IRepositorioPerfil {
  constructor(private readonly perfiles: Record<string, ResumenPerfilPropio>) {}

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return this.perfiles[usuarioId] ?? null;
  }
}

class RepositorioUsuariosFalso implements IRepositorioUsuarios {
  async existePorEmailActivo(): Promise<boolean> {
    return false;
  }

  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

class RepositorioMunicipiosFalso implements IRepositorioMunicipios {
  async crear(datos: DatosNuevoMunicipio): Promise<PerfilMunicipio> {
    return PerfilMunicipio.reconstruir(datos.id, {
      email: datos.email,
      nombreInstitucional: datos.nombreInstitucional,
      estadoVerificacion: 'verificado',
    });
  }
}

class ProveedorAutenticacionFalso implements IProveedorAutenticacion {
  async registrarCredenciales(datos: CredencialesRegistro): Promise<UsuarioAutenticado> {
    return { id: 'auth-municipio-1', email: datos.email };
  }

  async eliminarCredenciales(): Promise<void> {}

  async solicitarRecuperacionPassword(): Promise<void> {}
}

function autenticarComo(usuarioId: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: usuarioId } }, error: null });
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/municipio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const datosMunicipio = {
  email: 'municipio.pringles@ejemplo.test',
  password: 'contraseñaSegura123',
  nombreInstitucional: 'Municipalidad de Coronel Pringles — Zoonosis',
};

function registrarRepositorioPerfil(perfiles: Record<string, ResumenPerfilPropio>) {
  container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', new RepositorioPerfilFalso(perfiles));
}

describe('POST /api/admin/municipio (AUTH-03)', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    container.reset();
    container.registerSingleton<IRepositorioUsuarios>('IRepositorioUsuarios', RepositorioUsuariosFalso);
    container.registerSingleton<IRepositorioMunicipios>('IRepositorioMunicipios', RepositorioMunicipiosFalso);
    container.registerSingleton<IProveedorAutenticacion>('IProveedorAutenticacion', ProveedorAutenticacionFalso);
  });

  it.each([
    ['dueño', 'usuario-dueno'],
    ['veterinario', 'usuario-vet'],
    ['rescatista', 'usuario-rescatista'],
  ])('rechaza con 403 / PEA-AUTH-011 a un solicitante con rol %s', async (rol, usuarioId) => {
    autenticarComo(usuarioId);
    registrarRepositorioPerfil({
      [usuarioId]: { id: usuarioId, email: `${rol}@ejemplo.test`, rol, estadoVerificacion: 'no_requerido', verificadoEn: null },
    });

    const respuesta = await POST(crearRequest(datosMunicipio));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-AUTH-011');
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'sin sesión' } });
    registrarRepositorioPerfil({});

    const respuesta = await POST(crearRequest(datosMunicipio));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('un administrador crea la cuenta institucional (201), ya verificada', async () => {
    autenticarComo('usuario-admin');
    registrarRepositorioPerfil({
      'usuario-admin': {
        id: 'usuario-admin',
        email: 'admin@ejemplo.test',
        rol: 'administrador',
        estadoVerificacion: 'no_requerido',
        verificadoEn: null,
      },
    });

    const respuesta = await POST(crearRequest(datosMunicipio));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toMatchObject({ email: datosMunicipio.email, estadoVerificacion: 'verificado' });
  });
});
