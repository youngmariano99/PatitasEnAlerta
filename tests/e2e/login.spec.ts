import { test, expect } from '@playwright/test';
import { EMAIL_E2E, PASSWORD_E2E, PERFIL_DUENO, simularApi } from './support/ayudas';

test.describe('Login', () => {
  test('con credenciales válidas entra al panel del rol', async ({ page }) => {
    await simularApi(page, { 'GET /api/perfil': { body: PERFIL_DUENO } });

    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(EMAIL_E2E);
    await page.getByLabel('Contraseña').fill(PASSWORD_E2E);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByText('Hola, Dueño de mascota')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mis mascotas' })).toBeVisible();
  });

  test('con credenciales inválidas muestra el error y no navega', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(EMAIL_E2E);
    await page.getByLabel('Contraseña').fill('contraseña-equivocada');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByText('⚠️')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('una página protegida sin sesión redirige al login conservando el destino', async ({
    page,
  }) => {
    await page.goto('/mascotas');

    await expect(page).toHaveURL(/\/auth\/login\?redirectTo=%2Fmascotas/);
  });
});
