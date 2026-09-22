import { test, expect } from '@playwright/test';
import {
  FOTO_DE_PRUEBA,
  PERFIL_DUENO,
  iniciarSesion,
  simularApi,
  simularCloudinary,
} from './support/ayudas';

test('un dueño registra a su mascota con foto y termina en su listado', async ({ page }) => {
  const recibidas = await simularApi(page, {
    'GET /api/perfil': { body: PERFIL_DUENO },
    'POST /api/mascotas': { status: 201, body: { id: 'mascota-1' } },
    'GET /api/mascotas': {
      body: [
        {
          id: 'mascota-1',
          nombre: 'Toby',
          especie: 'perro',
          fotoUrl: 'https://res.cloudinary.com/e2e/image/upload/foto.png',
          raza: null,
          edadAproximada: null,
        },
      ],
    },
  });
  await simularCloudinary(page);
  await iniciarSesion(page);

  await page.goto('/mascotas/nueva');
  await page.locator('#foto').setInputFiles(FOTO_DE_PRUEBA);
  await page.getByLabel('Nombre').fill('Toby');
  await page.getByLabel('Especie').fill('perro');
  await page.getByRole('button', { name: 'Registrar mascota' }).click();

  await expect(page).toHaveURL(/\/mascotas$/);
  await expect(page.getByText('Toby')).toBeVisible();
  expect(recibidas['POST /api/mascotas'][0]).toMatchObject({
    nombre: 'Toby',
    especie: 'perro',
    fotoUrl: 'https://res.cloudinary.com/e2e/image/upload/foto.png',
  });
});

test('sin foto muestra el error en el campo de imagen y no envía nada', async ({ page }) => {
  const recibidas = await simularApi(page, { 'GET /api/perfil': { body: PERFIL_DUENO } });
  await iniciarSesion(page);

  await page.goto('/mascotas/nueva');
  await page.getByLabel('Nombre').fill('Toby');
  await page.getByLabel('Especie').fill('perro');
  await page.getByRole('button', { name: 'Registrar mascota' }).click();

  await expect(
    page.getByText('Necesitamos al menos una foto de tu mascota para completar el registro.'),
  ).toBeVisible();
  expect(recibidas['POST /api/mascotas']).toBeUndefined();
});
