'use client';

/**
 * Wrapper de `fetch` para llamar a la propia API (`/api/*`). Ante un 401
 * (sesión inexistente PEA-SIS-001 o vencida PEA-AUTH-005 — ver middleware.ts)
 * redirige a `/auth/login`, conservando la ruta de origen en `redirectTo`
 * para retomarla después de un nuevo login. Las páginas cliente deben usar
 * este wrapper en vez de `fetch` directo para llamadas a endpoints protegidos.
 */
export async function fetchConSesion(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const respuesta = await fetch(input, init);

  if (respuesta.status === 401 && typeof window !== 'undefined') {
    const loginUrl = new URL('/auth/login', window.location.origin);
    loginUrl.searchParams.set('redirectTo', window.location.pathname + window.location.search);
    window.location.assign(loginUrl.toString());
  }

  return respuesta;
}
