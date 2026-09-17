import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaReservarTurno from '@app/turnos/reservar/page';

const pushMock = jest.fn();
let eventoIdParam: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (clave: string) => (clave === 'eventoId' ? eventoIdParam : null),
  }),
}));

function mockFetchPorUrl(mapa: Record<string, unknown>) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const clave = Object.keys(mapa).find((k) => url.includes(k));
    return { ok: true, status: 200, json: async () => (clave ? mapa[clave] : {}) } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaReservarTurno (app/turnos/reservar)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    eventoIdParam = null;
  });

  it('sin eventoId: lista los operativos próximos con link a "Ver turnos"', async () => {
    mockFetchPorUrl({
      '/municipio/eventos': {
        items: [
          {
            id: 'evento-1',
            titulo: 'Castración móvil',
            direccion: 'Plaza San Martín',
            fecha: '2026-09-20T10:00:00.000Z',
          },
        ],
      },
    });
    render(<PaginaReservarTurno />);

    expect(await screen.findByText('Castración móvil')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver turnos' })).toBeInTheDocument();
  });

  it('con eventoId: muestra solo los turnos disponibles y permite reservar', async () => {
    eventoIdParam = 'evento-1';
    mockFetchPorUrl({
      '/municipio/eventos': {
        items: [
          {
            id: 'evento-1',
            titulo: 'Castración móvil',
            direccion: 'Plaza San Martín',
            fecha: '2026-09-20T10:00:00.000Z',
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
      '/turnos/reservar': { id: 't1', estado: 'reservado', reservadoPor: 'dueno-1', version: 1 },
    });
    const usuario = userEvent.setup();
    render(<PaginaReservarTurno />);

    expect(await screen.findByRole('button', { name: 'Reservar' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Reservar' })).toHaveLength(1);

    await usuario.click(screen.getByRole('button', { name: 'Reservar' }));

    expect(await screen.findByText('¡Turno reservado!')).toBeInTheDocument();
  });
});
