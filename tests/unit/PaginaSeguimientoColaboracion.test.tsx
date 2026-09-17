import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaSeguimientoColaboracion from '@app/red-colaboracion/colaboraciones/[id]/page';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'colab-1' }),
}));

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaSeguimientoColaboracion (app/red-colaboracion/colaboraciones/[id])', () => {
  it('muestra el historial y el estado actual con acciones disponibles', async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      body: [
        {
          id: 'h1',
          estadoAnterior: 'propuesta',
          estadoNuevo: 'propuesta',
          usuarioId: 'org-1',
          registradoEn: '2026-09-01T10:00:00.000Z',
        },
      ],
    }));
    render(<PaginaSeguimientoColaboracion />);

    expect(await screen.findByText('Propuesta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
  });

  it('acepta la colaboración y recarga el historial', async () => {
    const usuario = userEvent.setup();
    let aceptada = false;
    mockFetch((url, init) => {
      if (url.includes('/estado') && init?.method === 'PATCH') {
        aceptada = true;
        return { ok: true, status: 200, body: {} };
      }
      return {
        ok: true,
        status: 200,
        body: aceptada
          ? [
              {
                id: 'h1',
                estadoAnterior: 'propuesta',
                estadoNuevo: 'propuesta',
                usuarioId: 'org-1',
                registradoEn: '2026-09-01T10:00:00.000Z',
              },
              {
                id: 'h2',
                estadoAnterior: 'propuesta',
                estadoNuevo: 'aceptada',
                usuarioId: 'org-1',
                registradoEn: '2026-09-02T10:00:00.000Z',
              },
            ]
          : [
              {
                id: 'h1',
                estadoAnterior: 'propuesta',
                estadoNuevo: 'propuesta',
                usuarioId: 'org-1',
                registradoEn: '2026-09-01T10:00:00.000Z',
              },
            ],
      };
    });
    render(<PaginaSeguimientoColaboracion />);
    await screen.findByRole('button', { name: 'Aceptar' });

    await usuario.click(screen.getByRole('button', { name: 'Aceptar' }));

    expect(
      await screen.findByRole('button', { name: 'Marcar como completada' }),
    ).toBeInTheDocument();
  });
});
