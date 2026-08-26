import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Rutas que requieren sesión. Ampliar a medida que se agreguen módulos.
// Las rutas de solo-lectura pública (ej. /reportes, /adopciones, /municipio/eventos)
// se dejan deliberadamente fuera de esta lista.
const RUTAS_PROTEGIDAS = ['/panel', '/mascotas', '/municipio', '/veterinario', '/turnos', '/admin'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const requiereAuth = RUTAS_PROTEGIDAS.some((ruta) => request.nextUrl.pathname.startsWith(ruta));
  if (!requiereAuth) return response;

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
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
};
