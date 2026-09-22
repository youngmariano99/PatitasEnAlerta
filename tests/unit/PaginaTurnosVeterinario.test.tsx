import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaTurnosVeterinario from '@app/veterinario/turnos/page';

function mockFetchPorUrl(mapa: Record<string, unknown>) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const clave = Object.keys(mapa).find((k) => url.includes(k));
    return { ok: true, status: 200, json: async () => (clave ? mapa[clave] : {}) } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaTurnosVeterinario (app/veterinario/turnos)', () => {
  it('muestra los turnos reservados y la tasa de no-show', async () => {
    mockFetchPorUrl({
      '/veterinarios/turnos': {
        items: [
          {
            id: 't1',
            franjaInicio: '2020-01-01T10:00:00.000Z',
            franjaFin: '2020-01-01T10:30:00.000Z',
            reservadoPorEmail: 'dueno@ejemplo.test',
          },
        ],
      },
      '/turnos/mi-tasa-no-show': { totalConcluidos: 4, totalNoShow: 1, tasa: 0.25 },
    });
    render(<PaginaTurnosVeterinario />);

    expect(await screen.findByText('dueno@ejemplo.test')).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
    // El turno ya concluyó (fecha en el pasado): ofrece marcar asistencia.
    expect(screen.getByRole('button', { name: 'Asistió' })).toBeInTheDocument();
  });

  it('marca asistencia y recarga la lista', async () => {
    const usuario = userEvent.setup();
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/turnos/marcar-asistencia')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 't1', asistio: true }),
        } as Response;
      }
      if (url.includes('/veterinarios/turnos')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 't1',
                franjaInicio: '2020-01-01T10:00:00.000Z',
                franjaFin: '2020-01-01T10:30:00.000Z',
                reservadoPorEmail: 'dueno@ejemplo.test',
              },
            ],
          }),
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    render(<PaginaTurnosVeterinario />);
    const botonAsistio = await screen.findByRole('button', { name: 'Asistió' });
    await usuario.click(botonAsistio);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/turnos/marcar-asistencia'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
