import { createBrowserClient } from '@supabase/ssr';

/**
 * Único punto donde una página cliente habla directo con Supabase Auth, en
 * vez de pasar por nuestra propia API — excepción deliberada (igual que la
 * subida de imágenes a Cloudinary en app/mascotas/nueva): el token de
 * recuperación de contraseña llega en la URL que abre el navegador al hacer
 * click en el email, y Supabase Auth es quien lo genera, valida e invalida
 * exclusivamente (nunca se duplica esa lógica acá ni en el backend propio —
 * ver app/auth/recuperar-password/nueva/page.tsx).
 */
export function crearClienteSupabaseNavegador() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
