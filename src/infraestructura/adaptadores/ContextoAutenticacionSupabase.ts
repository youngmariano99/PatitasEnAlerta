import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

export interface UsuarioAutenticado {
  id: string;
}

/**
 * Resuelve el usuario autenticado de la request actual verificando el JWT
 * contra Supabase Auth (getUser(), no getSession() — mismo criterio que
 * middleware.ts: verificación real, no solo decodificación).
 *
 * Vive en infraestructura pero se llama directo desde los route handlers
 * (Presentación), no vía el contenedor de DI: necesita el `NextRequest` con
 * sus cookies, un tipo que los casos de uso nunca deben conocer. `middleware.ts`
 * ya protege las rutas de página (`/mascotas/*`) redirigiendo; las rutas de
 * API necesitan su propia verificación porque una API no debe responder con
 * una redirección HTML — tiene que devolver 401 en JSON.
 */
export async function obtenerUsuarioAutenticado(request: NextRequest): Promise<UsuarioAutenticado | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        // Route handler de solo verificación: no reescribe cookies en la
        // respuesta (a diferencia de middleware.ts, que sí posee la
        // response completa del ciclo de página).
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { id: user.id };
}
