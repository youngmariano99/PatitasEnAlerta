/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Alta de usuario con rol rescatista vía Abstract
 * Factory de formularios" (Módulo 5): registra un rescatista por
 * POST /api/auth/registro y confirma que, una vez autenticado, el sistema
 * se comporta según docs/ROLES.md — acceso de solo lectura al directorio de
 * aliados (rescatista está en ROLES_CON_ACCESO_AL_DIRECTORIO) y sin acceso
 * indebido a la publicación de solicitudes de recurso (exclusiva de
 * `organizacion`, ver PublicarSolicitudRecurso.ts).
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type {
  IProveedorAutenticacion,
  CredencialesRegistro,
  UsuarioAutenticado,
} from '@dominio/puertos/IProveedorAutenticacion';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type {
  AliadoDirectorio,
  FiltrosDirectorioAliados,
  IRepositorioDirectorioAliados,
  PaginaDirectorioAliados,
} from '@dominio/puertos/IRepositorioDirectorioAliados';
import type {
  DatosNuevaSolicitudRecurso,
  IRepositorioSolicitudesRecurso,
} from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import { SolicitudRecurso } from '@dominio/entidades/SolicitudRecurso';
import { Usuario, ROL_RESCATISTA_ID } from '@dominio/entidades/Usuario';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock (mismo criterio que el resto de tests/integration/*).
import { POST as postRegistro } from '@app/api/auth/registro/route';
import { GET as getDirectorio } from '@app/api/red-colaboracion/directorio/route';
import { POST as postSolicitudes } from '@app/api/red-colaboracion/solicitudes/route';

class RepositorioUsuariosFalso implements IRepositorioUsuarios {
  private readonly usuarios: Usuario[] = [];

  async existePorEmailActivo(email: string): Promise<boolean> {
    return this.usuarios.some((u) => u.email === email);
  }

  async crear(usuario: Usuario): Promise<Usuario> {
    this.usuarios.push(usuario);
    return usuario;
  }
}

class ProveedorAutenticacionFalso implements IProveedorAutenticacion {
  private contador = 0;

  async registrarCredenciales(datos: CredencialesRegistro): Promise<UsuarioAutenticado> {
    this.contador += 1;
    return { id: `rescatista-auth-${this.contador}`, email: datos.email };
  }

  async eliminarCredenciales(): Promise<void> {
    // no-op: nada que revertir en el fake.
  }

  async solicitarRecuperacionPassword(): Promise<void> {
    // no usado en este test
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'rescatista';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return {
      id: usuarioId,
      email: 'rescatista@ejemplo.test',
      rol: this.rol,
      estadoVerificacion: 'no_requerido',
      verificadoEn: null,
    };
  }
}

const aliadoDeEjemplo: AliadoDirectorio = {
  id: 'ong-1',
  rol: 'organizacion',
  email: 'ong@ejemplo.test',
  estadoVerificacion: 'verificado',
  matricula: null,
  colegioEmisor: null,
  latitud: -37.9989,
  longitud: -61.3565,
  createdAt: new Date('2026-09-09T09:00:00.000Z'),
};

class RepositorioDirectorioFalso implements IRepositorioDirectorioAliados {
  async listar(
    _filtros: FiltrosDirectorioAliados,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaDirectorioAliados> {
    return { items: [aliadoDeEjemplo], total: 1, pagina, porPagina };
  }
}

class RepositorioSolicitudesFalso implements IRepositorioSolicitudesRecurso {
  public creadas: DatosNuevaSolicitudRecurso[] = [];

  async crear(datos: DatosNuevaSolicitudRecurso): Promise<SolicitudRecurso> {
    this.creadas.push(datos);
    return SolicitudRecurso.reconstruir(
      `solicitud-${this.creadas.length}`,
      { ...datos, estado: 'abierta' },
      new Date(),
    );
  }

  async obtenerActual(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarAsistenciaVeterinariaAbiertas(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarAbiertas(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId
      ? { data: { user: { id: usuarioId } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequestRegistro(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function crearRequestDirectorio(): NextRequest {
  return new NextRequest('http://localhost/api/red-colaboracion/directorio');
}

function crearRequestSolicitudes(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/red-colaboracion/solicitudes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Registro de rescatista y su alcance de acceso (Módulo 5)', () => {
  let repositorioPerfil: RepositorioPerfilFalso;
  let repositorioSolicitudes: RepositorioSolicitudesFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioPerfil = new RepositorioPerfilFalso();
    repositorioSolicitudes = new RepositorioSolicitudesFalso();
    container.reset();
    container.registerSingleton<IRepositorioUsuarios>(
      'IRepositorioUsuarios',
      RepositorioUsuariosFalso,
    );
    container.registerSingleton<IProveedorAutenticacion>(
      'IProveedorAutenticacion',
      ProveedorAutenticacionFalso,
    );
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
    container.registerSingleton<IRepositorioDirectorioAliados>(
      'IRepositorioDirectorioAliados',
      RepositorioDirectorioFalso,
    );
    container.registerInstance<IRepositorioSolicitudesRecurso>(
      'IRepositorioSolicitudesRecurso',
      repositorioSolicitudes,
    );
  });

  it('registra un rescatista (201, rol_id=5) sin exigir ningún dato de verificación profesional', async () => {
    const respuesta = await postRegistro(
      crearRequestRegistro({
        email: 'rescatista1@ejemplo.test',
        password: 'contraseñaSegura123',
        rol: 'rescatista',
      }),
    );

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({
      id: 'rescatista-auth-1',
      email: 'rescatista1@ejemplo.test',
      rolId: ROL_RESCATISTA_ID,
    });
  });

  it('el rescatista registrado tiene acceso de solo lectura al directorio de aliados (200)', async () => {
    const respuestaRegistro = await postRegistro(
      crearRequestRegistro({
        email: 'rescatista2@ejemplo.test',
        password: 'contraseñaSegura123',
        rol: 'rescatista',
      }),
    );
    const { id: usuarioId } = await respuestaRegistro.json();

    autenticarComo(usuarioId);
    const respuestaDirectorio = await getDirectorio(crearRequestDirectorio());

    expect(respuestaDirectorio.status).toBe(200);
  });

  it('el rescatista registrado NO puede publicar solicitudes de recurso — función exclusiva de organizacion (403 / PEA-SIS-002)', async () => {
    const respuestaRegistro = await postRegistro(
      crearRequestRegistro({
        email: 'rescatista3@ejemplo.test',
        password: 'contraseñaSegura123',
        rol: 'rescatista',
      }),
    );
    const { id: usuarioId } = await respuestaRegistro.json();

    autenticarComo(usuarioId);
    const respuestaSolicitud = await postSolicitudes(
      crearRequestSolicitudes({
        tipo: 'insumos',
        descripcion: 'Necesitamos alimento balanceado para animales en tránsito.',
      }),
    );

    expect(respuestaSolicitud.status).toBe(403);
    const cuerpo = await respuestaSolicitud.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
    expect(repositorioSolicitudes.creadas).toHaveLength(0);
  });

  it('rechaza un segundo registro con el mismo email (409 / PEA-AUTH-001), sin importar si el primero fue dueño', async () => {
    await postRegistro(
      crearRequestRegistro({ email: 'compartido@ejemplo.test', password: 'contraseñaSegura123' }),
    );

    const segundaRespuesta = await postRegistro(
      crearRequestRegistro({
        email: 'compartido@ejemplo.test',
        password: 'otraContraseñaSegura123',
        rol: 'rescatista',
      }),
    );

    expect(segundaRespuesta.status).toBe(409);
    const cuerpo = await segundaRespuesta.json();
    expect(cuerpo.codigo).toBe('PEA-AUTH-001');
  });
});
