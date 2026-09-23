import { test, expect } from '@playwright/test';

test('la home carga y muestra el nombre del proyecto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Patitas en Alerta/i })).toBeVisible();
});
