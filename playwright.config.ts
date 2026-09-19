import { defineConfig, devices } from '@playwright/test';

const PUERTO_SUPABASE_FALSO = 54321;
const URL_SUPABASE_FALSO = `http://localhost:${PUERTO_SUPABASE_FALSO}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } }, // accesibilidad/táctil en mobile
  ],
  webServer: [
    {
      // Imita Supabase Auth (login + getUser() del middleware) para que los E2E
      // ejerciten la sesión real de la app sin un proyecto Supabase cloud.
      command: 'node tests/e2e/support/supabase-falso.cjs',
      url: `${URL_SUPABASE_FALSO}/health`,
      reuseExistingServer: !process.env.CI,
      env: { E2E_SUPABASE_PORT: String(PUERTO_SUPABASE_FALSO) },
    },
    {
      command: 'npm run build && npm run start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      // `npm run build` compila cada ruta agregada sprint a sprint (ya son
      // varias decenas de app/api/**/route.ts) antes de siquiera arrancar
      // `next start` — 120s dejó de alcanzar y el webServer nunca llegaba a
      // responder en http://localhost:3000 dentro del timeout, sin relación
      // con ningún caso de negocio puntual. Ver docs/DECISIONES.md.
      timeout: 300_000,
      // NEXT_PUBLIC_* se incrustan en el build: apuntan al Supabase falso.
      // Los secretos server-side son valores de relleno (los E2E nunca
      // llegan a la base de datos: la capa de datos se simula en el navegador).
      env: {
        NEXT_PUBLIC_SUPABASE_URL: URL_SUPABASE_FALSO,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-e2e',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-e2e',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'e2e',
        NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: 'e2e',
      },
    },
  ],
});
