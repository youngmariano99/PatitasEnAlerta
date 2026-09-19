import { test, expect } from '@playwright/test';
import { PERFIL_DUENO, iniciarSesion, simularApi } from './support/ayudas';

const EVENTO = {
  id: 'evento-1',
  titulo: 'Castración móvil',
  tipo: 'castracion',
  direccion: 'Plaza San Martín',
  fecha: '2026-10-01T12:00:00.000Z',
};

const TURNOS = [
  {
    id: 'turno-1',
    franjaInicio: '2026-10-01T12:00:00.000Z',
    franjaFin: '2026-10-01T12:30:00.000Z',
    estado: 'disponible',
  },
  {
    id: 'turno-2',
    franjaInicio: '2026-10-01T12:30:00.000Z',
    franjaFin: '2026-10-01T13:00:00.000Z',
    estado: 'reservado',
  },
];

test('un vecino elige un operativo y reserva un turno disponible', async ({ page }) => {
  const recibidas = await simularApi(page, {
    'GET /api/perfil': { body: PERFIL_DUENO },
    'GET /api/municipio/eventos': { body: { items: [EVENTO], total: 1, pagina: 1, porPagina: 20 } },
    'GET /api/turnos/por-evento': { body: TURNOS },
    'POST /api/turnos/reservar': { status: 201, body: { id: 'turno-1', estado: 'reservado' } },
  });
  await iniciarSesion(page);

  await page.goto('/turnos/reservar');
  await page.getByRole('button', { name: 'Ver turnos' }).click();

  // Solo el turno 'disponible' ofrece el botón de reservar.
  await expect(page.getByRole('button', { name: 'Reservar' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Reservar' }).click();

  await expect(page.getByText('¡Turno reservado!')).toBeVisible();
  expect(recibidas['POST /api/turnos/reservar'][0]).toEqual({ turnoId: 'turno-1' });
});

test('si otra persona ganó el turno (409), muestra el mensaje', async ({ page }) => {
  await simularApi(page, {
    'GET /api/perfil': { body: PERFIL_DUENO },
    'GET /api/municipio/eventos': { body: { items: [EVENTO], total: 1, pagina: 1, porPagina: 20 } },
    'GET /api/turnos/por-evento': { body: TURNOS },
    'POST /api/turnos/reservar': {
      status: 409,
      body: { codigo: 'PEA-MUN-001', mensaje: 'Ese turno ya fue reservado por otra persona.' },
    },
  });
  await iniciarSesion(page);

  await page.goto('/turnos/reservar?eventoId=evento-1');
  await page.getByRole('button', { name: 'Reservar' }).click();

  await expect(page.getByText('Ese turno ya fue reservado por otra persona.')).toBeVisible();
});
