import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { SesionExpiradaError } from '@dominio/errores/erroresAutenticacion';

// Páginas que requieren sesión — el usuario sin sesión se redirige a
// /auth/login. Ampliar a medida que se agreguen módulos.
// Las rutas de solo-lectura pública (ej. /reportes, /adopciones) se dejan
// deliberadamente fuera de esta lista. '/reportes/nuevo' es la única
// subruta protegida de /reportes: publicar un reporte exige sesión (el
// `reportadoPor` sale de ella), pero el listado público en '/reportes'
// tiene que seguir siendo accesible sin login. '/municipio/eventos' (el
// calendario público, Historia "Calendario público de operativos") sigue
// el mismo criterio dentro de /municipio — ver RUTAS_PAGINA_LECTURA_PUBLICA
// más abajo, que la exime puntualmente de este prefijo protegido.
const RUTAS_PAGINA_PROTEGIDAS = [
  '/panel',
  '/mascotas',
  '/municipio',
  '/veterinario',
  '/turnos',
  '/admin',
  '/reportes/nuevo',
];

// Coincidencia EXACTA (no por prefijo) de páginas públicas dentro de un
// prefijo protegido: '/municipio/eventos' es el calendario público (sin
// sesión ni rol), pero '/municipio/eventos/nuevo' (alta rápida) y el resto
// de /municipio siguen exigiendo rol municipio/administrador.
const RUTAS_PAGINA_LECTURA_PUBLICA = ['/municipio/eventos'];

function esPaginaLecturaPublica(pathname: string): boolean {
  return RUTAS_PAGINA_LECTURA_PUBLICA.includes(pathname);
}

// Endpoints de API que requieren sesión — a diferencia de una página, una
// API nunca debe responder con una redirección HTML: el usuario sin sesión
// recibe 401 en JSON (PEA-SIS-001 / PEA-AUTH-005), que el cliente interpreta
// (ver src/presentacion/lib/fetchConSesion.ts) para redirigir él mismo.
// /api/auth/* y /api/openapi quedan deliberadamente fuera: son de acceso público.
const RUTAS_API_PROTEGIDAS = [
  '/api/mascotas',
  '/api/perfil',
  '/api/admin',
  '/api/reportes',
  '/api/notificaciones',
  '/api/municipio',
  '/api/turnos',
];

// Excepción de método sobre RUTAS_API_PROTEGIDAS: un GET a estas rutas
// exactas es público (consulta de solo lectura, docs/ROLES.md 3.2/3.3 — RLS
// `reportes_select_publico`/`eventos_select_publico` + `GRANT SELECT ...
// TO anon`); POST (y cualquier otro método) sobre la misma ruta sigue
// protegido. Ninguno de estos GET depende de esta excepción para
// autorizar — la RLS pública ya lo permite — pero sin ella el usuario
// `anon` nunca llega a ejecutar el caso de uso. Coincidencia EXACTA (no por
// prefijo): subrutas como GET /api/reportes/[id]/historial
// (dueño/municipio/administrador, ListarHistorialReporte) NO son públicas y
// deben seguir cayendo en RUTAS_API_PROTEGIDAS.
const RUTAS_API_LECTURA_PUBLICA = ['/api/reportes', '/api/municipio/eventos'];

function esLecturaPublicaExacta(pathname: string, method: string): boolean {
  return method === 'GET' && RUTAS_API_LECTURA_PUBLICA.includes(pathname);
}

// Páginas que, además de sesión, exigen un rol puntual — Panel municipal de
// reportes activos (Módulo 2): '/municipio' completo (dashboard, eventos,
// turnera, adopciones) es exclusivo de municipio/administrador, igual que
// ya lo son las políticas RLS de esas tablas (docs/ROLES.md — `rol_actual()
// IN ('municipio','administrador')`). El checklist pide reforzarlo también
// acá, antes de que el panel llegue a renderizar.
const RUTAS_PAGINA_CON_ROL_REQUERIDO: Array<{ prefijo: string; roles: readonly string[] }> = [
  { prefijo: '/municipio', roles: ['municipio', 'administrador'] },
];

function esRutaProtegida(pathname: string, rutas: string[]): boolean {
  return rutas.some((ruta) => pathname.startsWith(ruta));
}

function rolesRequeridosPara(pathname: string): readonly string[] | null {
  const entrada = RUTAS_PAGINA_CON_ROL_REQUERIDO.find((r) => pathname.startsWith(r.prefijo));
  return entrada?.roles ?? null;
}

/**
 * Reutiliza `rol_actual()` (misma función SQL que ya evalúan las políticas
 * RLS — docs/ROLES.md 3.1) vía RPC, en vez de duplicar la lógica de
 * "usuario → rol_id → nombre del rol" acá. `SECURITY DEFINER` la hace
 * funcionar sin depender de que `usuarios` tenga (o no) RLS propia.
 */
async function obtenerRolActual(supabase: ReturnType<typeof createServerClient>): Promise<string | null> {
  const { data, error } = await supabase.rpc('rol_actual');
  if (error || typeof data !== 'string') return null;
  return data;
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

/**
 * A diferencia de "sin sesión" (→ /auth/login), un usuario autenticado con
 * el rol equivocado no tiene nada que iniciar sesión de nuevo — se lo manda
 * a la raíz en vez de mostrarle el panel municipal que no le corresponde.
 */
function redirigirPorRolInsuficiente(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/', request.url));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  const esLecturaPublica = esLecturaPublicaExacta(pathname, request.method);
  const esApiProtegida = esRutaProtegida(pathname, RUTAS_API_PROTEGIDAS) && !esLecturaPublica;
  const esPaginaProtegida = esRutaProtegida(pathname, RUTAS_PAGINA_PROTEGIDAS) && !esPaginaLecturaPublica(pathname);
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

  const rolesRequeridos = rolesRequeridosPara(pathname);
  if (rolesRequeridos) {
    const rol = await obtenerRolActual(supabase);
    if (!rol || !rolesRequeridos.includes(rol)) {
      return redirigirPorRolInsuficiente(request);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
};
