/**
 * @jest-environment node
 *
 * Ticket "Expiración automática de sesión": el middleware verifica firma y
 * expiración del JWT en cada request protegido (página o API), respondiendo
 * PEA-AUTH-005 (401) cuando la sesión venció, y nunca confía en el payload
 * decodificado localmente para autorizar — solo `getUser()` (verificación
 * real contra Supabase Auth) decide si hay acceso.
 */
import { NextRequest } from 'next/server';

const getUserMock = jest.fn();
const getSessionMock = jest.fn();
const rpcMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock, getSession: getSessionMock }, rpc: rpcMock })),
}));

import { middleware } from '../../middleware';

function crearRequest(pathname: string, method: string = 'GET'): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, { method });
}

function autenticadoComoRol(rol: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  rpcMock.mockResolvedValue({ data: rol, error: null });
}

function sesionExpiradaHaceUnaHora() {
  return { data: { session: { expires_at: Math.floor(Date.now() / 1000) - 3600 } } };
}

function sinSesionLocal() {
  return { data: { session: null } };
}

describe('middleware — expiración automática de sesión', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    getSessionMock.mockReset();
    rpcMock.mockReset();
  });

  describe('endpoints de API protegidos', () => {
    // Paso 1 del ticket "Configurar expiración de sesión a 1 hora" se
    // aplica en Supabase Auth (panel del proyecto); acá se verifica que el
    // middleware respeta esa expiración devolviendo 401.
    it.each([
      '/api/mascotas',
      '/api/perfil',
      '/api/admin/verificaciones',
      '/api/admin/auditoria',
      '/api/admin/municipio',
    ])('responde 401 (PEA-AUTH-005) en %s con un JWT vencido (Paso 4)', async (ruta) => {
      getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'jwt expired' } });
      getSessionMock.mockResolvedValue(sesionExpiradaHaceUnaHora());

      const respuesta = await middleware(crearRequest(ruta));

      expect(respuesta.status).toBe(401);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-AUTH-005');
    });

    it('responde 401 (PEA-SIS-001) cuando no hay sesión alguna, distinto de una sesión vencida', async () => {
      getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'sin sesión' } });
      getSessionMock.mockResolvedValue(sinSesionLocal());

      const respuesta = await middleware(crearRequest('/api/mascotas'));

      expect(respuesta.status).toBe(401);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-001');
    });

    it('ante firma inválida responde 401 sin confiar en el payload decodificado (aunque "parezca" vigente)', async () => {
      // El claim expires_at local muestra una sesión vigente, pero getUser()
      // — la única fuente de verdad — la rechaza: nunca debe otorgarse acceso
      // ni asumirse "expirada" solo por lo que dice el token sin verificar.
      getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'invalid signature' } });
      getSessionMock.mockResolvedValue({ data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } } });

      const respuesta = await middleware(crearRequest('/api/perfil'));

      expect(respuesta.status).toBe(401);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-001');
    });

    it('deja pasar la request cuando el JWT es válido, sin siquiera consultar la sesión local', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

      const respuesta = await middleware(crearRequest('/api/mascotas'));

      expect(respuesta.status).toBe(200);
      expect(getSessionMock).not.toHaveBeenCalled();
    });
  });

  describe('páginas protegidas (verificación técnica: 100% de las rutas privadas del sitemap)', () => {
    it.each(['/panel', '/mascotas', '/municipio', '/veterinario', '/turnos', '/admin/verificaciones', '/admin/auditoria'])(
      'redirige a /auth/login conservando la ruta de origen en %s cuando la sesión venció',
      async (ruta) => {
        getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'jwt expired' } });
        getSessionMock.mockResolvedValue(sesionExpiradaHaceUnaHora());

        const respuesta = await middleware(crearRequest(ruta));

        expect(respuesta.status).toBe(307);
        const location = new URL(respuesta.headers.get('location')!);
        expect(location.pathname).toBe('/auth/login');
        expect(location.searchParams.get('redirectTo')).toBe(ruta);
      },
    );

    it('deja pasar la navegación cuando el JWT es válido', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

      const respuesta = await middleware(crearRequest('/mascotas'));

      expect(respuesta.status).toBe(200);
    });
  });

  describe('rutas públicas', () => {
    it.each([
      '/auth/login',
      '/reportes',
      '/adopciones',
      '/api/auth/registro',
      '/api/auth/recuperar-password',
      '/api/openapi',
      '/api/reportes',
    ])('no exige sesión en %s (ni siquiera invoca a Supabase Auth)', async (ruta) => {
      const respuesta = await middleware(crearRequest(ruta));

      expect(respuesta.status).toBe(200);
      expect(getUserMock).not.toHaveBeenCalled();
    });
  });

  describe('excepción de método sobre /api/reportes (GET-only-público)', () => {
    // Listado y mapa de reportes activos: GET es público (RLS
    // reportes_select_publico + GRANT SELECT a anon), pero publicar un
    // reporte (POST) sigue exigiendo sesión — el `reportadoPor` sale de ahí.
    it('GET /api/reportes no exige sesión', async () => {
      const respuesta = await middleware(crearRequest('/api/reportes', 'GET'));

      expect(respuesta.status).toBe(200);
      expect(getUserMock).not.toHaveBeenCalled();
    });

    it('POST /api/reportes sigue exigiendo sesión (401 / PEA-SIS-001 sin sesión)', async () => {
      getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'sin sesión' } });
      getSessionMock.mockResolvedValue(sinSesionLocal());

      const respuesta = await middleware(crearRequest('/api/reportes', 'POST'));

      expect(respuesta.status).toBe(401);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-001');
    });

    it('POST /api/reportes deja pasar con sesión válida', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

      const respuesta = await middleware(crearRequest('/api/reportes', 'POST'));

      expect(respuesta.status).toBe(200);
    });

    // La excepción de lectura pública es de coincidencia EXACTA con
    // '/api/reportes', no por prefijo: GET a una subruta (ej. el historial
    // de un reporte puntual, exclusivo del dueño/municipio/administrador)
    // sigue exigiendo sesión.
    it('GET /api/reportes/[id]/historial SÍ exige sesión (no es la misma ruta que el listado público)', async () => {
      getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'sin sesión' } });
      getSessionMock.mockResolvedValue(sinSesionLocal());

      const respuesta = await middleware(crearRequest('/api/reportes/11111111-1111-1111-1111-111111111111/historial', 'GET'));

      expect(respuesta.status).toBe(401);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-001');
    });
  });

  describe('Panel municipal — /municipio exige rol municipio/administrador (Paso 1)', () => {
    it.each(['dueño', 'veterinario'])(
      'redirige a "/" (no a /auth/login) a un usuario autenticado con rol %s',
      async (rol) => {
        autenticadoComoRol(rol);

        const respuesta = await middleware(crearRequest('/municipio/dashboard'));

        expect(respuesta.status).toBe(307);
        const location = new URL(respuesta.headers.get('location')!);
        expect(location.pathname).toBe('/');
      },
    );

    it.each(['municipio', 'administrador'])('deja pasar a un usuario con rol %s', async (rol) => {
      autenticadoComoRol(rol);

      const respuesta = await middleware(crearRequest('/municipio/dashboard'));

      expect(respuesta.status).toBe(200);
    });

    it('reutiliza rol_actual() vía RPC — no consulta la tabla usuarios a mano', async () => {
      autenticadoComoRol('municipio');

      await middleware(crearRequest('/municipio/dashboard'));

      expect(rpcMock).toHaveBeenCalledWith('rol_actual');
    });

    it('redirige si rol_actual() no devuelve un rol resoluble (RPC falla o devuelve null)', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
      rpcMock.mockResolvedValue({ data: null, error: { message: 'función no disponible' } });

      const respuesta = await middleware(crearRequest('/municipio/dashboard'));

      expect(respuesta.status).toBe(307);
      const location = new URL(respuesta.headers.get('location')!);
      expect(location.pathname).toBe('/');
    });

    it('un usuario sin sesión sigue yendo a /auth/login (el chequeo de rol nunca corre antes que el de sesión)', async () => {
      getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'sin sesión' } });
      getSessionMock.mockResolvedValue(sinSesionLocal());

      const respuesta = await middleware(crearRequest('/municipio/dashboard'));

      expect(respuesta.status).toBe(307);
      const location = new URL(respuesta.headers.get('location')!);
      expect(location.pathname).toBe('/auth/login');
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('otras rutas de página (ej. /mascotas) no exigen rol, solo sesión', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

      const respuesta = await middleware(crearRequest('/mascotas'));

      expect(respuesta.status).toBe(200);
      expect(rpcMock).not.toHaveBeenCalled();
    });
  });
});
