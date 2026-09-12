import { defineConfig, devices } from '@playwright/test';

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
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // `npm run build` compila cada ruta agregada sprint a sprint (ya son
    // varias decenas de app/api/**/route.ts) antes de siquiera arrancar
    // `next start` — 120s dejó de alcanzar y el webServer nunca llegaba a
    // responder en http://localhost:3000 dentro del timeout, sin relación
    // con ningún caso de negocio puntual. Ver docs/DECISIONES.md.
    timeout: 300_000,
  },
});
