import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaLibretaSanitaria from '@app/mascotas/[id]/libreta/page';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'mascota-1' }),
}));

const libretaVacia = { items: [] };
const autorizacionesVacias: unknown[] = [];

function mockFetchPorUrl(mapa: Record<string, { ok: boolean; status: number; body: unknown }>) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const clave = Object.keys(mapa).find((k) => url.includes(k));
    const respuesta = clave ? mapa[clave]! : { ok: true, status: 200, body: {} };
    return {
      ok: respuesta.ok,
      status: respuesta.status,
      json: async () => respuesta.body,
    } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaLibretaSanitaria (app/mascotas/[id]/libreta)', () => {
  it('muestra el historial y las autorizaciones vigentes', async () => {
    mockFetchPorUrl({
      '/libreta': {
        ok: true,
        status: 200,
        body: {
          items: [
            {
              id: 'entrada-1',
              veterinarioId: 'vet-1',
              tipo: 'vacuna',
              descripcion: 'Vacuna antirrábica',
              fecha: '2026-09-01',
              createdAt: '2026-09-01T10:00:00.000Z',
            },
          ],
        },
      },
      '/autorizaciones': {
        ok: true,
        status: 200,
        body: [
          {
            id: 'auth-1',
            veterinarioId: 'vet-1',
            otorgadaEn: '2026-08-01T10:00:00.000Z',
            revocadaEn: null,
          },
        ],
      },
    });
    render(<PaginaLibretaSanitaria />);

    expect(await screen.findByText('Vacuna antirrábica')).toBeInTheDocument();
    expect(screen.getByText('vet-1')).toBeInTheDocument();
    expect(screen.getByText('Autorizado')).toBeInTheDocument();
  });

  it('muestra estados vacíos cuando no hay historial ni autorizaciones', async () => {
    mockFetchPorUrl({
      '/libreta': { ok: true, status: 200, body: libretaVacia },
      '/autorizaciones': { ok: true, status: 200, body: autorizacionesVacias },
    });
    render(<PaginaLibretaSanitaria />);

    expect(
      await screen.findByText('Todavía no autorizaste a ningún veterinario.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Todavía no hay entradas en la libreta sanitaria.'),
    ).toBeInTheDocument();
  });

  it('autoriza a un veterinario nuevo y recarga la lista', async () => {
    const usuario = userEvent.setup();
    let autorizado = false;
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/autorizaciones') && init?.method === 'POST') {
        autorizado = true;
        return { ok: true, status: 201, json: async () => ({}) } as Response;
      }
      if (url.includes('/libreta')) {
        return { ok: true, status: 200, json: async () => libretaVacia } as Response;
      }
      if (url.includes('/autorizaciones')) {
        return {
          ok: true,
          status: 200,
          json: async () =>
            autorizado
              ? [
                  {
                    id: 'auth-1',
                    veterinarioId: '22222222-2222-2222-2222-222222222222',
                    otorgadaEn: 'x',
                    revocadaEn: null,
                  },
                ]
              : autorizacionesVacias,
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    render(<PaginaLibretaSanitaria />);
    await screen.findByText('Todavía no autorizaste a ningún veterinario.');

    await usuario.type(
      screen.getByLabelText('Id del veterinario a autorizar'),
      '22222222-2222-2222-2222-222222222222',
    );
    await usuario.click(screen.getByRole('button', { name: 'Autorizar' }));

    expect(await screen.findByText('22222222-2222-2222-2222-222222222222')).toBeInTheDocument();
  });
});
