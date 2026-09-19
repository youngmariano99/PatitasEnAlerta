import { expect, type Page, type Route } from '@playwright/test';

export const EMAIL_E2E = 'dueno@e2e.test';
export const PASSWORD_E2E = 'e2e-password';

// PNG de 1x1 píxel — alcanza para el <input type="file" accept="image/*">.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export const FOTO_DE_PRUEBA = { name: 'foto.png', mimeType: 'image/png', buffer: PNG_1X1 };

export interface RespuestaSimulada {
  status?: number;
  body?: unknown;
}

type ManejadorApi = RespuestaSimulada | ((cuerpoPeticion: unknown) => RespuestaSimulada);

/**
 * Intercepta en el navegador las llamadas `/api/*` de negocio (la app real
 * sigue sirviendo las páginas y ejecutando su middleware de sesión; solo la
 * capa de datos está simulada, porque los E2E no levantan Postgres).
 * Devuelve las peticiones recibidas para poder afirmar sobre lo que la UI
 * realmente envió.
 */
export async function simularApi(
  page: Page,
  rutas: Record<string, ManejadorApi>,
): Promise<Record<string, unknown[]>> {
  const recibidas: Record<string, unknown[]> = {};

  await page.route('**/api/**', async (route: Route) => {
    const peticion = route.request();
    const { pathname } = new URL(peticion.url());
    const clave = `${peticion.method()} ${pathname}`;
    const manejador = rutas[clave];

    if (!manejador) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ codigo: 'E2E-404', mensaje: `Sin simulación para ${clave}` }),
      });
    }

    let cuerpoPeticion: unknown = undefined;
    try {
      cuerpoPeticion = peticion.postDataJSON();
    } catch {
      /* sin cuerpo JSON */
    }
    (recibidas[clave] ??= []).push(cuerpoPeticion);

    const respuesta = typeof manejador === 'function' ? manejador(cuerpoPeticion) : manejador;
    return route.fulfill({
      status: respuesta.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(respuesta.body ?? {}),
    });
  });

  return recibidas;
}

/** Cloudinary (subida directa desde el navegador) — nunca pega a la red real. */
export async function simularCloudinary(page: Page): Promise<void> {
  await page.route('https://api.cloudinary.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ secure_url: 'https://res.cloudinary.com/e2e/image/upload/foto.png' }),
    }),
  );
}

export const PERFIL_DUENO = {
  id: '11111111-1111-4111-8111-111111111111',
  email: EMAIL_E2E,
  rol: 'dueño',
  estadoVerificacion: 'no_requerido',
};

/** Login real por la UI (Supabase falso + middleware real). Deja al usuario en /panel. */
export async function iniciarSesion(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(EMAIL_E2E);
  await page.getByLabel('Contraseña').fill(PASSWORD_E2E);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/panel$/);
}
