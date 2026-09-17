import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaTurneraMunicipal from '@app/municipio/turnera/page';

function mockFetchPorUrl(mapa: Record<string, unknown>) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const clave = Object.keys(mapa).find((k) => url.includes(k));
    return { ok: true, status: 200, json: async () => (clave ? mapa[clave] : {}) } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaTurneraMunicipal (app/municipio/turnera)', () => {
  it('lista los eventos en el selector y muestra los turnos al elegir uno', async () => {
    const usuario = userEvent.setup();
    mockFetchPorUrl({
      '/municipio/eventos': {
        items: [
          {
            id: 'evento-1',
            titulo: 'Castración móvil',
            fecha: '2026-09-20T10:00:00.000Z',
            cuposTotales: 10,
          },
        ],
      },
      '/turnos/por-evento': [
        {
          id: 't1',
          franjaInicio: '2026-09-20T10:00:00.000Z',
          franjaFin: '2026-09-20T10:30:00.000Z',
          estado: 'disponible',
        },
        {
          id: 't2',
          franjaInicio: '2026-09-20T10:30:00.000Z',
          franjaFin: '2026-09-20T11:00:00.000Z',
          estado: 'reservado',
        },
      ],
    });
    render(<PaginaTurneraMunicipal />);

    const selector = await screen.findByLabelText('Operativo');
    await screen.findByText(/Castración móvil/);
    await usuario.selectOptions(selector, 'evento-1');

    expect(await screen.findByText('disponible')).toBeInTheDocument();
    expect(screen.getByText('reservado')).toBeInTheDocument();
    expect(screen.getByText(/1 disponibles · 1 reservados/)).toBeInTheDocument();
  });
});
