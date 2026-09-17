import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaCursos from '@app/cursos/page';

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaCursos (app/cursos)', () => {
  it('lista cursos y permite inscribirse, sin mostrar el formulario de publicar a un dueño', async () => {
    const usuario = userEvent.setup();
    mockFetch((url, init) => {
      if (url.includes('/api/perfil')) return { ok: true, status: 200, body: { rol: 'dueño' } };
      if (url.includes('/inscripciones') && init?.method === 'POST')
        return { ok: true, status: 201, body: {} };
      return {
        ok: true,
        status: 200,
        body: {
          items: [
            {
              id: 'c1',
              titulo: 'Tenencia responsable',
              descripcion: 'Curso básico',
              contenidoUrl: null,
            },
          ],
        },
      };
    });
    render(<PaginaCursos />);

    expect(await screen.findByText('Tenencia responsable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar curso' })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Inscribirme' }));

    expect(await screen.findByText('¡Te inscribiste!')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Darme de baja' })).toBeInTheDocument();
  });

  it('muestra el formulario de publicar a una organización', async () => {
    mockFetch((url) => {
      if (url.includes('/api/perfil'))
        return { ok: true, status: 200, body: { rol: 'organizacion' } };
      return { ok: true, status: 200, body: { items: [] } };
    });
    render(<PaginaCursos />);

    expect(await screen.findByRole('button', { name: 'Publicar curso' })).toBeInTheDocument();
  });
});
