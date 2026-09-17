import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaPacientesVeterinario from '@app/veterinario/pacientes/page';

function mockFetch(datos: unknown, ok = true) {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => datos }) as jest.Mock;
}

describe('PaginaPacientesVeterinario (app/veterinario/pacientes)', () => {
  it('muestra el estado vacío cuando no hay pacientes', async () => {
    mockFetch([]);
    render(<PaginaPacientesVeterinario />);

    expect(await screen.findByText('Todavía no tenés pacientes')).toBeInTheDocument();
  });

  it('lista los pacientes y permite registrar una entrada en la libreta', async () => {
    const usuario = userEvent.setup();
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/veterinarios/libreta') && init?.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({}) } as Response;
      }
      if (url.includes('/veterinarios/pacientes')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              mascotaId: 'mascota-1',
              nombre: 'Toby',
              especie: 'perro',
              fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
            },
          ],
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    render(<PaginaPacientesVeterinario />);
    await screen.findByText('Toby');

    await usuario.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    await usuario.type(screen.getByLabelText('Descripción'), 'Vacuna antirrábica aplicada.');
    await usuario.click(screen.getByRole('button', { name: 'Guardar entrada' }));

    expect(
      await screen.findByText('Entrada registrada en la libreta sanitaria.'),
    ).toBeInTheDocument();
  });
});
