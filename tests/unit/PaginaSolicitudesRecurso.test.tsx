import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaSolicitudesRecurso from '@app/red-colaboracion/solicitudes/page';

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaSolicitudesRecurso (app/red-colaboracion/solicitudes)', () => {
  it('lista las solicitudes abiertas y permite ofrecerse', async () => {
    const usuario = userEvent.setup();
    mockFetch((url, init) => {
      if (url.includes('/colaboraciones') && init?.method === 'POST') {
        return { ok: true, status: 201, body: {} };
      }
      return {
        ok: true,
        status: 200,
        body: {
          items: [
            {
              id: 'sol-1',
              organizacionId: 'org-1',
              tipo: 'transito',
              descripcion: 'Necesitamos tránsito para 2 gatos',
              estado: 'abierta',
              createdAt: '2026-09-01T10:00:00.000Z',
            },
          ],
        },
      };
    });
    render(<PaginaSolicitudesRecurso />);

    expect(await screen.findByText('Necesitamos tránsito para 2 gatos')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Ofrecerme' }));

    expect(await screen.findByText('Te ofreciste')).toBeInTheDocument();
  });

  it('publica una solicitud nueva', async () => {
    const usuario = userEvent.setup();
    mockFetch((url, init) => {
      if (url.includes('/red-colaboracion/solicitudes') && init?.method === 'POST') {
        return { ok: true, status: 201, body: {} };
      }
      return { ok: true, status: 200, body: { items: [] } };
    });
    render(<PaginaSolicitudesRecurso />);
    await screen.findByText('No hay solicitudes abiertas por el momento.');

    await usuario.selectOptions(screen.getByLabelText('Tipo de recurso'), 'insumos');
    await usuario.type(screen.getByLabelText('Descripción'), 'Necesitamos alimento balanceado');
    await usuario.click(screen.getByRole('button', { name: 'Publicar solicitud' }));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/red-colaboracion/solicitudes',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
