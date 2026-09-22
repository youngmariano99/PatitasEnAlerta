import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaAgendaVeterinario from '@app/veterinario/agenda/page';

function mockFetchSecuencial(...respuestas: Array<{ ok: boolean; body: unknown }>) {
  const mockFn = jest.fn();
  respuestas.forEach((r) => {
    mockFn.mockImplementationOnce(async () => ({ ok: r.ok, json: async () => r.body }));
  });
  global.fetch = mockFn as unknown as typeof fetch;
  return mockFn;
}

describe('PaginaAgendaVeterinario (app/veterinario/agenda)', () => {
  it('muestra las franjas ya configuradas', async () => {
    mockFetchSecuencial({
      ok: true,
      body: [{ id: 'f1', diaSemana: 1, horaInicio: '09:00', horaFin: '13:00', activo: true }],
    });
    render(<PaginaAgendaVeterinario />);

    expect(await screen.findByText('Lunes · 09:00 a 13:00')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('configura una franja nueva y muestra cuántos turnos generó', async () => {
    const usuario = userEvent.setup();
    mockFetchSecuencial(
      { ok: true, body: [] },
      {
        ok: true,
        body: {
          id: 'f1',
          diaSemana: 1,
          horaInicio: '09:00',
          horaFin: '13:00',
          activo: true,
          turnosGenerados: 8,
        },
      },
      {
        ok: true,
        body: [{ id: 'f1', diaSemana: 1, horaInicio: '09:00', horaFin: '13:00', activo: true }],
      },
    );
    render(<PaginaAgendaVeterinario />);
    await screen.findByText('Todavía no configuraste ninguna franja horaria.');

    await usuario.type(screen.getByLabelText('Desde'), '09:00');
    await usuario.type(screen.getByLabelText('Hasta'), '13:00');
    await usuario.click(screen.getByRole('button', { name: 'Agregar franja' }));

    expect(await screen.findByText(/Se generaron 8 turnos nuevos disponibles/)).toBeInTheDocument();
  });
});
