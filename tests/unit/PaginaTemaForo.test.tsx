import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaTemaForo from '@app/foro/[id]/page';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'tema-1' }),
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

const tema = {
  id: 'tema-1',
  creadoPor: 'user-1',
  titulo: 'Alimentación felina',
  contenido: 'Consejos generales',
  createdAt: '2026-09-17T10:00:00.000Z',
};

describe('PaginaTemaForo (app/foro/[id])', () => {
  it('muestra el tema, sus respuestas, y permite responder', async () => {
    const usuario = userEvent.setup();
    let respondido = false;
    mockFetch((url, init) => {
      if (url.includes('/api/perfil')) return { ok: true, status: 200, body: { rol: 'dueño' } };
      if (url.includes('/temas?porPagina=50'))
        return { ok: true, status: 200, body: { items: [tema] } };
      if (url.includes('/respuestas') && init?.method === 'POST') {
        respondido = true;
        return { ok: true, status: 201, body: {} };
      }
      return {
        ok: true,
        status: 200,
        body: respondido
          ? [
              {
                id: 'r1',
                temaId: 'tema-1',
                usuarioId: 'user-2',
                contenido: 'Gracias!',
                createdAt: '2026-09-17T11:00:00.000Z',
              },
            ]
          : [],
      };
    });
    render(<PaginaTemaForo />);

    expect(await screen.findByText('Alimentación felina')).toBeInTheDocument();
    await screen.findByText('Todavía no hay respuestas. Sé el primero en responder.');

    await usuario.type(screen.getByLabelText('Tu respuesta'), 'Gracias!');
    await usuario.click(screen.getByRole('button', { name: 'Responder' }));

    expect(await screen.findByText('Gracias!')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Moderar (contenido inapropiado)' }),
    ).not.toBeInTheDocument();
  });

  it('muestra el botón de moderar a un administrador', async () => {
    mockFetch((url) => {
      if (url.includes('/api/perfil'))
        return { ok: true, status: 200, body: { rol: 'administrador' } };
      if (url.includes('/temas?porPagina=50'))
        return { ok: true, status: 200, body: { items: [tema] } };
      return { ok: true, status: 200, body: [] };
    });
    render(<PaginaTemaForo />);

    expect(
      await screen.findByRole('button', { name: 'Moderar (contenido inapropiado)' }),
    ).toBeInTheDocument();
  });
});
