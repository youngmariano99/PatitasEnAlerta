import { test, expect } from '@playwright/test';
import {
  FOTO_DE_PRUEBA,
  PERFIL_DUENO,
  iniciarSesion,
  simularApi,
  simularCloudinary,
} from './support/ayudas';

test.use({
  geolocation: { latitude: -37.9989, longitude: -61.3565 },
  permissions: ['geolocation'],
});

test('un vecino publica un reporte de mascota perdida (wizard de 3 pasos)', async ({ page }) => {
  const recibidas = await simularApi(page, {
    'GET /api/perfil': { body: PERFIL_DUENO },
    'POST /api/reportes': { status: 201, body: { id: 'reporte-1' } },
    'GET /api/reportes': { body: { items: [], total: 0, pagina: 1, porPagina: 50 } },
    'GET /api/geocoding/reverse': { body: null },
  });
  await simularCloudinary(page);
  await iniciarSesion(page);

  await page.goto('/reportes/nuevo?tipo=perdido');

  // Paso 1: foto
  await page.locator('#foto').setInputFiles(FOTO_DE_PRUEBA);
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Paso 2: descripción + especie
  await page.getByLabel('¿Qué pasó?').fill('Se escapó de casa cerca de la plaza, responde a Toby.');
  await page.locator('#especie-categoria').selectOption('perro');
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Paso 3: ubicación automática por geolocalización
  await expect(page.getByText('Usamos tu ubicación actual')).toBeVisible();
  await page.getByRole('button', { name: 'Publicar reporte' }).click();

  // Tras publicar un "perdido" no redirige de inmediato: primero muestra los
  // "encontrado" cercanos a la zona marcada (ver ResultadosCercanosTrasPublicar).
  await expect(page.getByText('¡Reporte publicado!')).toBeVisible();
  expect(recibidas['POST /api/reportes']).toHaveLength(1);
  expect(recibidas['POST /api/reportes'][0]).toMatchObject({
    tipo: 'perdido',
    especie: 'perro',
    fotoUrl: 'https://res.cloudinary.com/e2e/image/upload/foto.png',
    latitud: -37.9989,
    longitud: -61.3565,
  });

  await page.getByRole('button', { name: 'Ir al listado de reportes' }).click();
  await expect(page).toHaveURL(/\/reportes$/);
});

test('no deja avanzar del paso 1 sin foto', async ({ page }) => {
  await simularApi(page, { 'GET /api/perfil': { body: PERFIL_DUENO } });
  await iniciarSesion(page);

  await page.goto('/reportes/nuevo?tipo=perdido');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText('Necesitamos una foto para publicar el reporte.')).toBeVisible();
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
});
