import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaForo from '@app/foro/page';

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaForo (app/foro)', () => {
  it('publica un tema y lo muestra en la lista', async () => {
    const usuario = userEvent.setup();
    let publicado = false;
    mockFetch((url, init) => {
      if (url.endsWith('/api/foros-cursos/temas') && init?.method === 'POST') {
        publicado = true;
        return { ok: true, status: 201, body: {} };
      }
      return {
        ok: true,
        status: 200,
        body: {
          items: publicado
            ? [
                {
                  id: 't1',
                  creadoPor: 'user-1',
                  titulo: 'Alimentación felina',
                  contenido: 'Consejos generales',
                  createdAt: '2026-09-17T10:00:00.000Z',
                },
              ]
            : [],
        },
      };
    });
    render(<PaginaForo />);
    await screen.findByText('Todavía no hay temas publicados.');

    await usuario.type(screen.getByLabelText('Título'), 'Alimentación felina');
    await usuario.type(screen.getByLabelText('Contenido'), 'Consejos generales');
    await usuario.click(screen.getByRole('button', { name: 'Publicar tema' }));

    expect(await screen.findByText('Alimentación felina')).toBeInTheDocument();
  });
});
