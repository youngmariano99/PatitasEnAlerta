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

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock, getSession: getSessionMock } })),
}));

import { middleware } from '../../middleware';

function crearRequest(pathname: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, { method: 'GET' });
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
    it.each(['/auth/login', '/reportes', '/adopciones', '/api/auth/registro', '/api/auth/recuperar-password', '/api/openapi'])(
      'no exige sesión en %s (ni siquiera invoca a Supabase Auth)',
      async (ruta) => {
        const respuesta = await middleware(crearRequest(ruta));

        expect(respuesta.status).toBe(200);
        expect(getUserMock).not.toHaveBeenCalled();
      },
    );
  });
});
