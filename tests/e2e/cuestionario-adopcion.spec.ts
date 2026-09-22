import { test, expect } from '@playwright/test';
import { PERFIL_DUENO, iniciarSesion, simularApi } from './support/ayudas';

test('un adoptante completa el cuestionario y ve sugerencias ordenadas por compatibilidad', async ({
  page,
}) => {
  let guardado = false;
  const cuestionarioGuardado = {
    horasSoloEstimadas: 4,
    presenciaNinos: null,
    espacioDisponible: null,
    experienciaPrevia: null,
  };
  const recibidas = await simularApi(page, {
    'GET /api/perfil': { body: PERFIL_DUENO },
    'GET /api/adopcion-compatibilidad/cuestionario': () =>
      guardado
        ? { body: cuestionarioGuardado }
        : { status: 404, body: { codigo: 'PEA-ADOP-001', mensaje: 'Sin cuestionario' } },
    'POST /api/adopcion-compatibilidad/cuestionario': () => {
      guardado = true;
      return { status: 201, body: cuestionarioGuardado };
    },
    'POST /api/adopcion-compatibilidad/sugerencias': {
      body: [
        { id: 's1', vitrinaAdopcionId: 'f1', scoreCompatibilidad: 0.62, metodo: 'reglas' },
        { id: 's2', vitrinaAdopcionId: 'f2', scoreCompatibilidad: 0.91, metodo: 'reglas' },
      ],
    },
    'GET /api/adopciones': {
      body: {
        items: [
          { id: 'f1', nombreAnimal: 'Luna', especie: 'gato', fotoUrl: '/animales/Registro.png' },
          { id: 'f2', nombreAnimal: 'Rocco', especie: 'perro', fotoUrl: '/animales/Registro.png' },
        ],
      },
    },
  });
  await iniciarSesion(page);

  await page.goto('/adopciones/compatibilidad');
  await expect(
    page.getByRole('button', { name: 'Ver sugerencias de compatibilidad' }),
  ).toBeDisabled();

  await page.getByLabel(/horas por día/).fill('4');
  await page.getByRole('button', { name: 'Guardar cuestionario' }).click();
  await expect(page.getByText('Cuestionario guardado.')).toBeVisible();
  expect(recibidas['POST /api/adopcion-compatibilidad/cuestionario'][0]).toMatchObject({
    horasSoloEstimadas: 4,
  });

  await page.getByRole('button', { name: 'Ver sugerencias de compatibilidad' }).click();

  const compatibilidades = page.getByText(/% de compatibilidad/);
  await expect(compatibilidades).toHaveCount(2);
  await expect(compatibilidades.first()).toHaveText('91% de compatibilidad');
  await expect(page.getByText('Rocco')).toBeVisible();
});
