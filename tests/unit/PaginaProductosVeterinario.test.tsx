import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaProductosVeterinario from '@app/veterinario/productos/page';

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaProductosVeterinario (app/veterinario/productos)', () => {
  it('publica un producto y lo muestra en la lista', async () => {
    const usuario = userEvent.setup();
    let publicado = false;
    mockFetch((url, init) => {
      if (url.endsWith('/api/veterinarios/productos') && init?.method === 'POST') {
        publicado = true;
        return { ok: true, status: 201, body: {} };
      }
      return {
        ok: true,
        status: 200,
        body: {
          items: publicado
            ? [{ id: 'p1', nombre: 'Antipulgas', descripcion: null, precio: 5000, stock: 10 }]
            : [],
        },
      };
    });
    render(<PaginaProductosVeterinario />);
    await screen.findByText('Todavía no publicaste ningún producto.');

    await usuario.type(screen.getByLabelText('Nombre'), 'Antipulgas');
    await usuario.type(screen.getByLabelText('Precio'), '5000');
    await usuario.type(screen.getByLabelText('Stock'), '10');
    await usuario.click(screen.getByRole('button', { name: 'Publicar producto' }));

    expect(await screen.findByText('Antipulgas')).toBeInTheDocument();
  });

  it('da de baja un producto existente', async () => {
    const usuario = userEvent.setup();
    let dadoDeBaja = false;
    mockFetch((url, init) => {
      if (url.includes('/api/veterinarios/productos/p1') && init?.method === 'DELETE') {
        dadoDeBaja = true;
        return { ok: true, status: 200, body: { id: 'p1' } };
      }
      return {
        ok: true,
        status: 200,
        body: {
          items: dadoDeBaja
            ? []
            : [{ id: 'p1', nombre: 'Antipulgas', descripcion: null, precio: 5000, stock: 10 }],
        },
      };
    });
    render(<PaginaProductosVeterinario />);
    await screen.findByText('Antipulgas');

    await usuario.click(screen.getByRole('button', { name: 'Dar de baja' }));

    expect(await screen.findByText('Todavía no publicaste ningún producto.')).toBeInTheDocument();
  });
});
