import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { SesionExpiradaError } from '@dominio/errores/erroresAutenticacion';

// Páginas que requieren sesión — el usuario sin sesión se redirige a
// /auth/login. Ampliar a medida que se agreguen módulos.
// Las rutas de solo-lectura pública (ej. /reportes, /adopciones, /municipio/eventos)
// se dejan deliberadamente fuera de esta lista. '/reportes/nuevo' es la
// única subruta protegida de /reportes: publicar un reporte exige sesión
// (el `reportadoPor` sale de ella), pero el listado público en '/reportes'
// tiene que seguir siendo accesible sin login.
const RUTAS_PAGINA_PROTEGIDAS = [
  '/panel',
  '/mascotas',
  '/municipio',
  '/veterinario',
  '/turnos',
  '/admin',
  '/reportes/nuevo',
];

// Endpoints de API que requieren sesión — a diferencia de una página, una
// API nunca debe responder con una redirección HTML: el usuario sin sesión
// recibe 401 en JSON (PEA-SIS-001 / PEA-AUTH-005), que el cliente interpreta
// (ver src/presentacion/lib/fetchConSesion.ts) para redirigir él mismo.
// /api/auth/* y /api/openapi quedan deliberadamente fuera: son de acceso público.
const RUTAS_API_PROTEGIDAS = ['/api/mascotas', '/api/perfil', '/api/admin', '/api/reportes'];

// Excepción de método sobre RUTAS_API_PROTEGIDAS: un GET a estas rutas es
// público (consulta de solo lectura, docs/ROLES.md 3.2 — RLS
// `reportes_select_publico` + `GRANT SELECT ON reportes TO anon`); POST
// (y cualquier otro método) sobre la misma ruta sigue protegido. GET
// /api/reportes/route.ts no depende de esta excepción para autorizar — la
// RLS pública ya lo permite — pero sin ella el usuario `anon` nunca llega a
// ejecutar el caso de uso.
const RUTAS_API_LECTURA_PUBLICA = ['/api/reportes'];

function esRutaProtegida(pathname: string, rutas: string[]): boolean {
  return rutas.some((ruta) => pathname.startsWith(ruta));
}

/**
 * Determina, únicamente a fines de elegir el código de error correcto en un
 * 401 que `getUser()` YA decidió, si la sesión local (sin verificar contra
 * Supabase Auth) luce expirada. Nunca se usa para autorizar — la única
 * fuente de verdad de autorización es `getUser()`, que valida la firma y la
 * vigencia del JWT contra el servidor (no una simple decodificación local,
 * ver NFR de Seguridad en CLAUDE.md). Si no hay sesión local, o su claim
 * `expires_at` no venció, se asume "sin sesión" en vez de "expirada".
 */
async function sesionLocalExpirada(
  supabase: ReturnType<typeof createServerClient>,
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.expires_at) return false;
  return session.expires_at * 1000 < Date.now();
}

function respuestaJson401(error: NoAutenticadoError | SesionExpiradaError): NextResponse {
  return NextResponse.json({ codigo: error.codigo, mensaje: error.message }, { status: error.statusHttp });
}

function redirigirALogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  const esLecturaPublica = request.method === 'GET' && esRutaProtegida(pathname, RUTAS_API_LECTURA_PUBLICA);
  const esApiProtegida = esRutaProtegida(pathname, RUTAS_API_PROTEGIDAS) && !esLecturaPublica;
  const esPaginaProtegida = esRutaProtegida(pathname, RUTAS_PAGINA_PROTEGIDAS);
  if (!esApiProtegida && !esPaginaProtegida) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida la firma del JWT contra Supabase Auth — NUNCA usar
  // getSession() acá para autorizar, porque solo decodifica el token local
  // sin verificar que siga siendo válido (regla explícita del proyecto:
  // "Decodificación + Verificación de Tokens: no solo decodificación").
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const expirada = await sesionLocalExpirada(supabase);
    const errorAuth = expirada ? new SesionExpiradaError() : new NoAutenticadoError();

    if (esApiProtegida) return respuestaJson401(errorAuth);
    return redirigirALogin(request);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
};
